import { SITE_URL } from '@/lib/env';

const BASE_URL = SITE_URL;

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changefreq: string;
}> = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/welfare/categories', priority: 0.8, changefreq: 'weekly' },
  { path: '/about', priority: 0.5, changefreq: 'monthly' },
  { path: '/contact', priority: 0.4, changefreq: 'monthly' },
  { path: '/editorial-policy', priority: 0.4, changefreq: 'monthly' },
  { path: '/terms', priority: 0.3, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
  { path: '/marketing', priority: 0.2, changefreq: 'yearly' },
];

export async function GET() {
  const now = new Date().toISOString();
  const urls = STATIC_ROUTES.map((r) => {
    return `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
