import { prisma } from '@/lib/prisma';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

const BATCH_SIZE = 1000;

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

/**
 * 정책 배치별 사이트맵.
 * URL 예: /sitemap-policies-1.xml, /sitemap-policies-2.xml ...
 *
 * 각 배치당 최대 1000개. 구글 제한 5만개·50MB 이하 유지.
 */
export async function GET(
  _req: Request,
  { params }: { params: { batch: string } }
) {
  const batch = Math.max(1, parseInt(params.batch, 10) || 1);
  const skip = (batch - 1) * BATCH_SIZE;

  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, viewCount: true },
    orderBy: { updatedAt: 'desc' },
    skip,
    take: BATCH_SIZE,
  });

  const urls = policies
    .map((p) => {
      const priority = Math.min(
        0.9,
        0.5 + (p.viewCount || 0) * 0.001
      ).toFixed(2);
      return `  <url>
    <loc>${BASE_URL}/welfare/${encodeURIComponent(p.slug)}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
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
