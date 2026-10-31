// Cloudflare Pages Function: POST /api/register
import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
  try {
    const body: any = await request.json();
    const {
      event_id,
      husband_name,
      wife_name,
      whatsapp,
      email,
      answers = {},
      turnstile_token,
    } = body;

    if (!event_id || !husband_name?.trim() || !wife_name?.trim() || !whatsapp?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Nama suami, nama istri, dan nomor WhatsApp wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Clean WA
    let cleanWa = whatsapp.replace(/[\s\-().+]/g, '');
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
    if (!cleanWa.startsWith('62')) cleanWa = '62' + cleanWa;

    // Validate Turnstile
    if (env.TURNSTILE_SECRET && turnstile_token) {
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(env.TURNSTILE_SECRET)}&response=${encodeURIComponent(turnstile_token)}`,
        });
        const verifyData: any = await verifyRes.json();
        if (!verifyData.success) {
          return new Response(
            JSON.stringify({ error: 'Verifikasi keamanan captcha gagal.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Turnstile verification error:', e);
      }
    }

    const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Form fields validation & snapshot
    const { data: formFields } = await supabase
      .from('form_fields')
      .select('field_key, label, is_required')
      .eq('event_id', event_id);

    const formSnapshot: Record<string, string> = {};
    if (formFields) {
      for (const f of formFields) {
        formSnapshot[f.field_key] = f.label;
        if (f.is_required) {
          const ans = answers[f.field_key];
          if (ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
            return new Response(
              JSON.stringify({ error: `${f.label} wajib diisi.` }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Call RPC
    const { data: regResult, error: rpcError } = await supabase.rpc('register_couple', {
      p_event_id: event_id,
      p_husband_name: husband_name.trim(),
      p_wife_name: wife_name.trim(),
      p_whatsapp: cleanWa,
      p_email: email?.trim() || null,
      p_answers: answers,
      p_form_snapshot: formSnapshot,
    });

    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes('EVENT_FULL')) {
        return new Response(
          JSON.stringify({ code: 'EVENT_FULL', error: 'Mohon maaf, kuota pendaftaran kelas ini sudah penuh.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (msg.includes('DUPLICATE_PHONE')) {
        return new Response(
          JSON.stringify({ code: 'DUPLICATE_PHONE', error: 'Nomor WhatsApp ini sudah terdaftar pada kelas ini.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (msg.includes('EVENT_NOT_OPEN')) {
        return new Response(
          JSON.stringify({ code: 'EVENT_NOT_OPEN', error: 'Pendaftaran kelas ini sedang tidak dibuka.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw rpcError;
    }

    const { data: eventData } = await supabase
      .from('events')
      .select('title, price_per_couple, success_message, wa_to_admin_template')
      .eq('id', event_id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...regResult,
          event_title: eventData?.title,
          price_per_couple: eventData?.price_per_couple,
          success_message: eventData?.success_message,
          wa_to_admin_template: eventData?.wa_to_admin_template,
          husband_name: husband_name.trim(),
          wife_name: wife_name.trim(),
          whatsapp: cleanWa,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Terjadi kesalahan sistem saat memproses pendaftaran.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
