// Auth guards for admin and QRClass routes
import { createClient } from '@supabase/supabase-js';
import type { AstroGlobal } from 'astro';
import { getServerEnv } from './server-env';
import { verifyQrToken } from './jwt';

/**
 * Guard for admin routes.
 * Returns admin data if authenticated, or redirects to /admin/login.
 * Call at the top of every admin Astro page.
 */
export async function requireAdmin(Astro: AstroGlobal) {
  // Get session from cookie
  const authHeader = Astro.request.headers.get('cookie') ?? '';
  const accessToken = extractCookieValue(authHeader, 'sb-access-token');

  if (!accessToken) {
    return Astro.redirect('/admin/login');
  }

  const supabaseUrl = getServerEnv('PUBLIC_SUPABASE_URL', import.meta.env.PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = getServerEnv('PUBLIC_SUPABASE_ANON_KEY', import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  // Verify session
  const { data: { user }, error } = await client.auth.getUser(accessToken);

  if (error || !user) {
    return Astro.redirect('/admin/login');
  }

  // Check admins table
  const { data: adminData, error: adminError } = await client
    .from('admins')
    .select('id, name, email, whatsapp, role, is_active')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (adminError || !adminData) {
    return Astro.redirect('/admin/login?error=unauthorized');
  }

  return { user, admin: adminData };
}

/**
 * Guard for QRClass routes.
 * Returns event staff data if authenticated via JWT cookie.
 */
export async function requireQrStaff(Astro: AstroGlobal) {
  const authHeader = Astro.request.headers.get('cookie') ?? '';
  const qrToken = extractCookieValue(authHeader, 'qr-staff-token');

  if (!qrToken) {
    return Astro.redirect('/qrclass?error=session_expired');
  }

  // Verify JWT
  const jwtSecret = getServerEnv('QR_JWT_SECRET', import.meta.env.QR_JWT_SECRET || 'default-secret-qr-key-123456789');
  const payload = await verifyQrToken(qrToken, jwtSecret);

  if (!payload || !payload.event_id) {
    return Astro.redirect('/qrclass?error=invalid_session');
  }

  return { eventId: payload.event_id as string, staffName: (payload.staff_name as string) || 'Pendata' };
}

export function extractCookieValue(cookieStr: string, name: string): string | null {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
