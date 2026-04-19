import { prisma } from '@/lib/prisma';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
  });

  const urls = categories
    .map((c) => {
      return `  <url>
    <loc>${BASE_URL}/welfare/categories/${encodeURIComponent(c.slug)}</loc>
    <lastmod>${c.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('\n');

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
