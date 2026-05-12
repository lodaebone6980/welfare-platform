import { SITE_URL } from '@/lib/env';

const BASE_URL = SITE_URL;

export const revalidate = 3600; // 1시간 캐시
export const dynamic = 'force-dynamic';

/**
 * Sitemap Index — sitemap.xml
 *
 * 구조:
 *   /sitemap.xml                 ← 이 파일 (index)
 *   /sitemap-static.xml          고정 페이지
 *   /sitemap-categories.xml      카테고리
 *   /sitemap-policies.xml        색인 가능한 정책 상세 페이지
 *
 * 이걸 robots.txt와 각 웹마스터 도구(구글 GSC, 네이버 SA, 다음, 빙)에 제출.
 */
export async function GET() {
  const entries: string[] = [];
  const lastMod = new Date().toISOString();

  entries.push(buildEntry(`${BASE_URL}/sitemap-static.xml`, lastMod));
  entries.push(buildEntry(`${BASE_URL}/sitemap-categories.xml`, lastMod));
  entries.push(buildEntry(`${BASE_URL}/sitemap-policies.xml`, lastMod));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function buildEntry(loc: string, lastMod: string) {
  return `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>`;
}
