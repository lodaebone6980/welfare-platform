const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changefreq: string;
}> = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/welfare/search', priority: 0.9, changefreq: 'daily' },
  { path: '/welfare/categories', priority: 0.8, changefreq: 'weekly' },
  { path: '/recommend', priority: 0.7, changefreq: 'weekly' },
  { path: '/mypage', priority: 0.3, changefreq: 'monthly' },
  { path: '/more', priority: 0.4, changefreq: 'monthly' },
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
