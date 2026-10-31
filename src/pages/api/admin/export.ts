export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../lib/supabase';
import { formatDateWIB } from '../../../lib/format';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const eventId = url.searchParams.get('event_id');
    if (!eventId) {
      return new Response('Event ID wajib disertakan', { status: 400 });
    }

    // Verify admin
    const cookieHeader = request.headers.get('cookie') ?? '';
    const accessToken = extractCookieValue(cookieHeader, 'sb-access-token');

    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await client.auth.getUser(accessToken);
    if (!user) {
      return new Response('Invalid session', { status: 401 });
    }

    const service = createServiceClient();

    // Get event title & slug
    const { data: event } = await service
      .from('events')
      .select('title, slug')
      .eq('id', eventId)
      .single();

    // Fetch all registrations for this event
    const { data: registrations } = await service
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const rows = registrations || [];

    // Determine custom fields columns from form_snapshot
    const dynamicHeadersMap: Record<string, string> = {};
    rows.forEach((r) => {
      if (r.form_snapshot && typeof r.form_snapshot === 'object') {
        Object.entries(r.form_snapshot).forEach(([k, label]) => {
          dynamicHeadersMap[k] = label as string;
        });
      }
    });

    const dynamicKeys = Object.keys(dynamicHeadersMap);

    // CSV Headers
    const headers = [
      'Kode Pendaftaran',
      'Nama Suami',
      'Nama Istri',
      'WhatsApp',
      'Email',
      'Status Pembayaran',
      'Tanggal Daftar',
      'Waktu Lunas',
      'Catatan Bayar',
      'Status Hadir',
      'Waktu Hadir',
      ...dynamicKeys.map((k) => dynamicHeadersMap[k]),
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvLines = [headers.map(escapeCsv).join(',')];

    rows.forEach((r) => {
      const answers = (r.answers || {}) as Record<string, any>;
      const line = [
        r.reg_code,
        r.husband_name,
        r.wife_name,
        r.whatsapp,
        r.email || '',
        r.payment_status,
        formatDateWIB(r.created_at, { showTime: true }),
        r.payment_confirmed_at ? formatDateWIB(r.payment_confirmed_at, { showTime: true }) : '',
        r.payment_note || '',
        r.checkin_at ? 'Hadir' : 'Belum',
        r.checkin_at ? formatDateWIB(r.checkin_at, { showTime: true }) : '',
        ...dynamicKeys.map((k) => {
          const val = answers[k];
          if (Array.isArray(val)) return val.join('; ');
          return val !== undefined && val !== null ? String(val) : '';
        }),
      ];
      csvLines.push(line.map(escapeCsv).join(','));
    });

    // UTF-8 BOM
    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const filename = `peserta-${event?.slug || eventId}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return new Response(err.message || 'Export error', { status: 500 });
  }
};
