export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../lib/auth';
import { verifyQrToken } from '../../../lib/jwt';
import { createServiceClient } from '../../../lib/supabase';
import { getServerEnv } from '../../../lib/server-env';

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const qrToken = extractCookieValue(cookieHeader, 'qr-staff-token');

    if (!qrToken) {
      return new Response(JSON.stringify({ error: 'Sesi scanner telah berakhir' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const jwtSecret = getServerEnv('QR_JWT_SECRET', import.meta.env.QR_JWT_SECRET || 'default-secret-qr-key-123456789');
    const payload = await verifyQrToken(qrToken, jwtSecret);

    if (!payload || !payload.event_id) {
      return new Response(JSON.stringify({ error: 'Sesi scanner tidak valid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    let rawToken = body.token?.trim() || '';

    if (!rawToken) {
      return new Response(JSON.stringify({ error: 'Kode atau token tiket wajib disertakan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If full URL was scanned (e.g. https://happycoupleclass.com/tiket/abc...), extract the last part
    if (rawToken.includes('/tiket/')) {
      const parts = rawToken.split('/tiket/');
      rawToken = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
    }

    const supabase = createServiceClient();

    // Call database function checkin_ticket
    const { data: checkinResult, error: rpcError } = await supabase.rpc('checkin_ticket', {
      p_token: rawToken,
      p_event_id: payload.event_id,
      p_checked_in_by: payload.staff_name || 'Petugas Scanner',
    });

    if (rpcError) throw rpcError;

    return new Response(JSON.stringify(checkinResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Checkin error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Gagal memproses checkin' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
