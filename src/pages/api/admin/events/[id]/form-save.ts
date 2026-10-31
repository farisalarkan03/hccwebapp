export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../../../lib/supabase';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const eventId = params.id;
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin
    const cookieHeader = request.headers.get('cookie') ?? '';
    const accessToken = extractCookieValue(cookieHeader, 'sb-access-token');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await client.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const fields = body.fields || [];

    const service = createServiceClient();

    // 1. Delete fields not present in payload
    const currentKeys = fields.map((f: any) => f.field_key);
    if (currentKeys.length > 0) {
      await service
        .from('form_fields')
        .delete()
        .eq('event_id', eventId)
        .not('field_key', 'in', `(${currentKeys.join(',')})`);
    } else {
      await service.from('form_fields').delete().eq('event_id', eventId);
    }

    // 2. Upsert each field
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await service.from('form_fields').upsert(
        {
          event_id: eventId,
          field_key: f.field_key,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder || null,
          help_text: f.help_text || null,
          is_required: Boolean(f.is_required),
          options: f.options || null,
          sort_order: i,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,field_key' }
      );
    }

    return new Response(JSON.stringify({ success: true, count: fields.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
