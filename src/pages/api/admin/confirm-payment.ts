export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../lib/supabase';
import { getServerEnv } from '../../../lib/server-env';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verify admin
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
      return new Response(JSON.stringify({ error: 'Invalid admin session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { registration_id, note } = body;

    if (!registration_id) {
      return new Response(JSON.stringify({ error: 'Registration ID wajib disertakan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const service = createServiceClient();

    // 2. Call confirm_payment database RPC
    const { error: rpcError } = await service.rpc('confirm_payment', {
      p_registration_id: registration_id,
      p_admin_id: user.id,
      p_note: note || null,
    });

    if (rpcError) {
      throw rpcError;
    }

    // 3. Fetch registration to get ticket token & couple phone
    const { data: reg } = await service
      .from('registrations')
      .select('id, reg_code, ticket_token, husband_name, wife_name, whatsapp, event_id')
      .eq('id', registration_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        registration: reg,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Confirm payment error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Gagal mengonfirmasi pembayaran' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
