import { prisma } from '@/lib/prisma';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

const SITE_TITLE = '국민자료실';
const SITE_SUBTITLE = '정부 지원금·환급금·보조금 통합검색';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

/**
 * Atom 1.0 (feed.xml)
 *
 * Google Alerts, Feedly, Bing, 구독형 수집기가 선호.
 * Google Search Console에서는 sitemap.xml 권장하지만 feed.xml도 제출 가능.
 */
export async function GET() {
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 50,
    include: { category: true },
  });

  const entries = policies
    .map((p) => {
      const url = `${BASE_URL}/welfare/${encodeURIComponent(p.slug)}`;
      const updated = (p.updatedAt || p.publishedAt || new Date()).toISOString();
      const published = (p.publishedAt || p.updatedAt || new Date()).toISOString();
      const title = escapeXml(p.title.replace(/^\[.*?\]\s*/, ''));
      const summary = escapeXml(
        (p.excerpt || p.description || title).substring(0, 400)
      );
      return `  <entry>
    <title>${title}</title>
    <link href="${url}" />
    <id>${url}</id>
    <updated>${updated}</updated>
    <published>${published}</published>
    <summary>${summary}</summary>
    <author><name>국민자료실 편집부</name></author>
    <category term="${escapeXml(p.category?.slug || 'welfare')}" label="${escapeXml(p.category?.name || '복지')}"/>
  </entry>`;
    })
    .join('\n');

  const now = new Date().toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ko-KR">
  <title>${escapeXml(SITE_TITLE)}</title>
  <subtitle>${escapeXml(SITE_SUBTITLE)}</subtitle>
  <link href="${BASE_URL}/feed.xml" rel="self" />
  <link href="${BASE_URL}" />
  <id>${BASE_URL}/</id>
  <updated>${now}</updated>
  <generator uri="https://nextjs.org">Next.js</generator>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
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
