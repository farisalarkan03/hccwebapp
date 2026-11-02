export const prerender = false;

import type { APIRoute } from 'astro';
import { extractCookieValue } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '../../../lib/supabase';
import { getServerEnv } from '../../../lib/server-env';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verify admin session
    const cookieHeader = request.headers.get('cookie') ?? '';
    const accessToken = extractCookieValue(cookieHeader, 'sb-access-token');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = getServerEnv('PUBLIC_SUPABASE_URL', import.meta.env.PUBLIC_SUPABASE_URL);
    const supabaseAnonKey = getServerEnv('PUBLIC_SUPABASE_ANON_KEY', import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user } } = await client.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Sesi admin tidak valid atau telah berakhir.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin is active
    const { data: adminRecord } = await client
      .from('admins')
      .select('id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminRecord) {
      return new Response(JSON.stringify({ error: 'Akses ditolak: Akun admin tidak aktif.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || !(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ error: 'File gambar wajib disertakan.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limit check: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Ukuran file terlalu besar (maksimal 10MB).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const service = createServiceClient();
    const bucketName = 'flyers';

    // 3. Ensure bucket exists
    try {
      const { data: buckets } = await service.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);

      if (!bucketExists) {
        await service.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
      }
    } catch (e) {
      console.warn('Check/create bucket warning:', e);
    }

    // 4. Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const cleanBase = file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    const fileName = `${Date.now()}-${cleanBase || 'flyer'}.${ext}`;
    const filePath = `events/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await service.storage
      .from(bucketName)
      .upload(filePath, uint8, {
        contentType: file.type || 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 6. Get public URL
    const { data: { publicUrl } } = service.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: fileName,
        size: file.size,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Upload flyer error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Gagal mengunggah file flyer.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
