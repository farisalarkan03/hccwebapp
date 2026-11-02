export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../../../lib/supabase';
import { getServerEnv } from '../../../../../lib/server-env';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const eventId = params.id;
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID wajib disertakan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin session
    const cookieHeader = request.headers.get('cookie') ?? '';
    const accessToken = extractCookieValue(cookieHeader, 'sb-access-token');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = getServerEnv('PUBLIC_SUPABASE_URL', import.meta.env.PUBLIC_SUPABASE_URL);
    const supabaseAnonKey = getServerEnv('PUBLIC_SUPABASE_ANON_KEY', import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await client.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Sesi admin tidak valid atau telah berakhir' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check admin is active
    const { data: adminRecord } = await client
      .from('admins')
      .select('id, name, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminRecord) {
      return new Response(JSON.stringify({ error: 'Akun admin tidak aktif' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const newStatus = body.status;

    const allowedStatuses = ['draft', 'open', 'closed', 'done'];
    if (!allowedStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: 'Status event tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const service = createServiceClient();
    const { error: updateError } = await service
      .from('events')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .is('deleted_at', null);

    if (updateError) throw updateError;

    // Optional audit log
    try {
      await service.from('audit_logs').insert({
        admin_id: user.id,
        action: 'UPDATE_EVENT_STATUS',
        entity_name: 'events',
        entity_id: eventId,
        details: { new_status: newStatus, admin_name: adminRecord.name },
      });
    } catch (e) {
      console.warn('Audit log notice:', e);
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Update event status error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Gagal mengubah status event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

