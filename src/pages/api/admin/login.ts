export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return new Response(
        JSON.stringify({ error: 'Email dan password wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Konfigurasi Supabase belum diset di server.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.session || !authData.user) {
      return new Response(
        JSON.stringify({
          error: authError?.message === 'Invalid login credentials'
            ? 'Email atau kata sandi salah.'
            : (authError?.message || 'Gagal masuk.')
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = authData.user;
    const session = authData.session;

    // Check if user is in admins table and is_active
    const clientWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    });

    const { data: adminData, error: adminError } = await clientWithAuth
      .from('admins')
      .select('id, name, email, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({ error: 'Akun Anda tidak memiliki akses admin atau sedang dinonaktifkan.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set auth cookies for 7 days
    const maxAge = 7 * 24 * 60 * 60;
    const isHttps = url.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';

    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    headers.append(
      'Set-Cookie',
      `sb-access-token=${encodeURIComponent(session.access_token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`
    );
    headers.append(
      'Set-Cookie',
      `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        redirect: '/admin',
        token: session.access_token,
        refreshToken: session.refresh_token,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    console.error('Admin login error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Terjadi kesalahan sistem saat mencoba masuk.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
