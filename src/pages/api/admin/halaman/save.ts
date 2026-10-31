export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const accessToken = extractCookieValue(cookieHeader, 'sb-access-token');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await client.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      title,
      slug,
      summary,
      cover_url,
      related_event_id,
      show_on_landing,
      status,
      blocks,
    } = body;

    const service = createServiceClient();

    if (id) {
      // Update
      const { data, error } = await service
        .from('pages')
        .update({
          title,
          slug,
          summary: summary || null,
          cover_url: cover_url || null,
          related_event_id: related_event_id || null,
          show_on_landing: Boolean(show_on_landing),
          status: status || 'draft',
          blocks: blocks || [],
          published_at: status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id')
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });
    } else {
      // Insert
      const { data, error } = await service
        .from('pages')
        .insert({
          title,
          slug,
          summary: summary || null,
          cover_url: cover_url || null,
          related_event_id: related_event_id || null,
          show_on_landing: Boolean(show_on_landing),
          status: status || 'draft',
          blocks: blocks || [],
          published_at: status === 'published' ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal menyimpan halaman' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
