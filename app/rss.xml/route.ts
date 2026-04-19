import { prisma } from '@/lib/prisma';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

const SITE_TITLE = '정책지금 – 정부 지원금·환급금·보조금 통합검색';
const SITE_DESC =
  '2026년 최신 정부 지원금, 환급금, 보조금, 바우처 정보를 한눈에.';

export const revalidate = 1800; // 30분
export const dynamic = 'force-dynamic';

/**
 * RSS 2.0 (rss.xml)
 *
 * 네이버 서치어드바이저, 다음 검색, 일부 크롤러가 선호.
 * 네이버 SA에서 "RSS 제출" 필드에 https://yourdomain.com/rss.xml 입력.
 * 최신 50개 정책만 포함 (RSS는 휘발성이 특성).
 */
export async function GET() {
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    include: { category: true },
  });

  const items = policies
    .map((p) => {
      const url = `${BASE_URL}/welfare/${encodeURIComponent(p.slug)}`;
      const pubDate = (p.publishedAt || p.updatedAt).toUTCString();
      const title = escapeXml(
        p.title.replace(/^\[.*?\]\s*/, '').substring(0, 100)
      );
      const desc = escapeXml(
        (p.excerpt || p.description || title).substring(0, 300)
      );
      const category = escapeXml(p.category?.name || '복지정책');
      return `    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${desc}</description>
      <category>${category}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('\n');

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${BASE_URL}</link>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(SITE_DESC)}</description>
    <language>ko-KR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Next.js</generator>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
