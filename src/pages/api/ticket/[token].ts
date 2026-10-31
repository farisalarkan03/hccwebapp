export const prerender = false;

import type { APIRoute } from 'astro';
import { createServiceClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ params }) => {
  try {
    const token = params.token;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServiceClient();

    // Fetch registration by ticket_token
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        reg_code,
        ticket_token,
        husband_name,
        wife_name,
        whatsapp,
        payment_status,
        checkin_at,
        created_at,
        events (
          id,
          title,
          slug,
          date_start,
          date_end,
          location,
          location_map_url,
          price_per_couple,
          flyer_url
        )
      `)
      .eq('ticket_token', token)
      .is('deleted_at', null)
      .single();

    if (regError || !reg) {
      return new Response(JSON.stringify({ error: 'Tiket tidak ditemukan' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get confirmator WA
    const { data: confData } = await supabase
      .from('event_confirmators')
      .select('admins (whatsapp)')
      .eq('event_id', (reg.events as any)?.id)
      .eq('is_primary', true)
      .single();

    const confirmatorWa = (confData?.admins as any)?.whatsapp || '628123456789';

    return new Response(
      JSON.stringify({
        ticket: {
          ...reg,
          confirmator_wa: confirmatorWa,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
