export const prerender = false;

import type { APIRoute } from 'astro';
import { createServiceClient } from '../../../lib/supabase';
import { signQrToken } from '../../../lib/jwt';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { event_id, password, staff_name } = body;

    if (!event_id?.trim() || !password?.trim()) {
      return new Response(
        JSON.stringify({ error: 'ID Event dan Password wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();

    // 1. Verify event exists
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, title, status')
      .eq('id', event_id.trim())
      .is('deleted_at', null)
      .single();

    if (eventErr || !event) {
      return new Response(
        JSON.stringify({ error: 'ID event atau password salah.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Call database function verify_event_staff
    const { data: isValid, error: rpcError } = await supabase.rpc('verify_event_staff', {
      p_event_id: event.id,
      p_password: password.trim(),
    });

    if (rpcError) {
      if (rpcError.message.includes('ACCOUNT_LOCKED')) {
        return new Response(
          JSON.stringify({ error: 'Akun scanner terkunci selama 15 menit karena terlalu banyak percobaan gagal.' }),
          { status: 423, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw rpcError;
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'ID event atau password salah.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Generate 12-hour JWT
    const jwtSecret = import.meta.env.QR_JWT_SECRET || 'default-secret-qr-key-123456789';
    const payload = {
      event_id: event.id,
      event_title: event.title,
      staff_name: staff_name?.trim() || 'Tim Pendata',
      exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    };

    const token = await signQrToken(payload, jwtSecret);

    // Set cookie (12 hours)
    const maxAge = 12 * 3600;
    const cookieHeader = `qr-staff-token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`;

    return new Response(
      JSON.stringify({ success: true, redirect: '/qrclass/scan' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (err: any) {
    console.error('QRClass login error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Terjadi kesalahan sistem' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
