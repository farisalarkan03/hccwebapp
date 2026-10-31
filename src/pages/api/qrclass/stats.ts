export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../lib/auth';
import { verifyQrToken } from '../../../lib/jwt';
import { createServiceClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const qrToken = extractCookieValue(cookieHeader, 'qr-staff-token');

    if (!qrToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const jwtSecret = import.meta.env.QR_JWT_SECRET || 'default-secret-qr-key-123456789';
    const payload = await verifyQrToken(qrToken, jwtSecret);

    if (!payload || !payload.event_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch attended count and total paid count
    const { data: regs } = await supabase
      .from('registrations')
      .select('payment_status, checkin_at')
      .eq('event_id', payload.event_id)
      .is('deleted_at', null);

    const paidCount = (regs || []).filter((r) => r.payment_status === 'paid').length;
    const attendedCount = (regs || []).filter((r) => r.checkin_at !== null).length;

    return new Response(
      JSON.stringify({
        paid_count: paidCount,
        attended_count: attendedCount,
        event_title: payload.event_title || 'Happy Couple Class',
        staff_name: payload.staff_name || 'Petugas',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error' }), { status: 500 });
  }
};
