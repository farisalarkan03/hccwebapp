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
    const { id } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID Halaman wajib disertakan' }), { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service
      .from('pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Gagal menghapus halaman' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
