// app/robots.txt/route.ts
// Static robots.ts metadata route cannot output arbitrary comments (like Daum WebMaster auth line)
// so we use a Route Handler instead. The old app/robots.ts must be deleted to avoid conflict.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr';

const BODY = `#DaumWebMasterTool:46685ba240bc5b572108d42c094c51aad90258bb4d5d8672ddebc105d86ac778:lnJIfW6J3SEu/tDeE4/ZJg==

User-Agent: *
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

Host: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml
`;

// Cache: search engine bots can fetch frequently; keep CDN cache short (5 min)
// for quick propagation of verification code updates.
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
