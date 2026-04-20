// app/robots.txt/route.ts
// 정적 robots.ts 메타데이터 라우트는 임의 코멘트(예: Daum WebMaster 인증 라인)를
// 출력할 수 없으므로 Route Handler로 대체합니다.
// 기존 app/robots.ts 는 함께 삭제해야 충돌이 발생하지 않습니다.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr';

const BODY = `User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /login/
Disallow: /account/
Disallow: /mypage/
Disallow: /notifications/
Disallow: /*?*sort=
Disallow: /*?*page=

User-Agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /login/
Disallow: /account/
Disallow: /mypage/

User-Agent: Googlebot-Image
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/

User-Agent: Yeti
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /login/
Disallow: /account/
Disallow: /mypage/

User-Agent: Yeti-Mobile
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/

User-Agent: Daumoa
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /login/
Disallow: /account/
Disallow: /mypage/

User-Agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /dashboard/
Disallow: /login/
Disallow: /account/

#DaumWebMasterTool:46685ba240bc5b572108d42c094c51aad90258bb4d5d8672ddebc105d86ac778:lnJIfW6J3SEu/tDeE4/ZJg==

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
