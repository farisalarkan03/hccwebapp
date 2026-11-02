export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase, createServiceClient } from '../lib/supabase';
import { getServerEnv } from '../lib/server-env';

export const GET: APIRoute = async () => {
  const siteUrl = (getServerEnv('PUBLIC_SITE_URL', import.meta.env.PUBLIC_SITE_URL || 'https://happycoupleclass.com')).replace(/\/$/, '');

  let client = supabase;
  try {
    client = createServiceClient();
  } catch (e) {
    client = supabase;
  }

  // Fetch active & published events
  const { data: events } = await client
    .from('events')
    .select('slug, updated_at')
    .in('status', ['published', 'sold_out'])
    .is('deleted_at', null);

  // Fetch published custom pages
  const { data: pages } = await client
    .from('pages')
    .select('slug, updated_at')
    .eq('status', 'published')
    .is('deleted_at', null);

  const urls: Array<{ loc: string; lastmod?: string; changefreq: string; priority: string }> = [
    { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/privasi`, changefreq: 'monthly', priority: '0.3' },
  ];

  if (events && events.length > 0) {
    for (const ev of events) {
      urls.push({
        loc: `${siteUrl}/event/${ev.slug}`,
        lastmod: ev.updated_at ? new Date(ev.updated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'daily',
        priority: '0.9',
      });
    }
  }

  if (pages && pages.length > 0) {
    for (const p of pages) {
      urls.push({
        loc: `${siteUrl}/p/${p.slug}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : undefined,
        changefreq: 'weekly',
        priority: '0.7',
      });
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemapXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
