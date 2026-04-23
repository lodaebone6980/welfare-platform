// app/robots.txt/route.ts
// 정적 robots.ts 메타데이터 라우트는 임의 코멘트(예: Daum WebMaster 인증 라인)를
// 출력할 수 없으므로 Route Handler로 대체합니다.
// 기존 app/robots.ts 는 함께 삭제해야 충돌이 발생하지 않습니다.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr';

// 어드민/비공개 경로 공통 Disallow (검색엔진 모든 봇 동일 적용)
const ADMIN_DISALLOW = [
  '/admin/',
  '/api/',
  '/_next/',
  '/dashboard/',
  '/content/',
  '/marketing/',
  '/popularity/',
  '/members/',
  '/settings/',
  '/search-trending/',
  '/trending/',
  '/trending-news/',
  '/traffic/',
  '/api-status/',
  '/access/',
  '/login/',
  '/account/',
  '/mypage/',
  '/notifications/',
]
  .map((p) => `Disallow: ${p}`)
  .join('\n');

const BODY = `User-Agent: *
Allow: /
${ADMIN_DISALLOW}
Disallow: /*?*sort=
Disallow: /*?*page=

User-Agent: Googlebot
Allow: /
${ADMIN_DISALLOW}

User-Agent: Googlebot-Image
Allow: /
${ADMIN_DISALLOW}

User-Agent: Yeti
Allow: /
${ADMIN_DISALLOW}

User-Agent: Yeti-Mobile
Allow: /
${ADMIN_DISALLOW}

User-Agent: Daumoa
Allow: /
${ADMIN_DISALLOW}

User-Agent: Bingbot
Allow: /
${ADMIN_DISALLOW}

#DaumWebMasterTool:1d1c83a6a81ba6a42a7262cae8562baa06f19ae2517989e7da365193f33e786d:lnJIfW6J3SEu/tDeE4/ZJg==

Host: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml
`;

// 캐시 정책: 검색엔진 봇은 자주 가져가도 부담 없음.
// 인증 코드 변경 즉시 반영을 위해 짧게 5분만 CDN 캐시.
export const revalidate = 300;

export async function GET() {
  return new Response(BODY, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control':
        'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
