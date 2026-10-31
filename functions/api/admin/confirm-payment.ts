import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async ({ request, env }: { request: Request; env: any }) => {
  try {
    const authHeader = request.headers.get('cookie') ?? '';
    const match = authHeader.match(/(?:^|;\s*)sb-access-token=([^;]+)/);
    const accessToken = match ? decodeURIComponent(match[1]) : null;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body: any = await request.json();
    const { registration_id, note } = body;

    const { error: rpcError } = await supabase.rpc('confirm_payment', {
      p_registration_id: registration_id,
      p_admin_id: user.id,
      p_note: note || null,
    });

    if (rpcError) throw rpcError;

    const { data: reg } = await supabase
      .from('registrations')
      .select('id, reg_code, ticket_token, husband_name, wife_name, whatsapp, event_id')
      .eq('id', registration_id)
      .single();

    return new Response(JSON.stringify({ success: true, registration: reg }), {
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
