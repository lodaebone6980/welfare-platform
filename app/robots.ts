import { MetadataRoute } from 'next';

// SEO/GEO/AEO: 실제 운영 도메인으로 통일 (구 Vercel preview URL 제거)
const BASE_URL = 'https://www.govmate.co.kr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 기본: 모든 크롤러
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
          '/dashboard/',
          '/login/',
          '/account/',
          '/mypage/',
          '/notifications/',
          '/*?*sort=',  // 정렬 파라미터 중복 색인 방지
          '/*?*page=',  // 페이지네이션 중복 색인 방지
        ],
      },
      // Google
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/', '/login/', '/account/', '/mypage/'],
      },
      // Google 이미지 (GEO/AEO 대비)
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      // Naver - Yeti
      {
        userAgent: 'Yeti',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/', '/login/', '/account/', '/mypage/'],
      },
      // Naver - 모바일
      {
        userAgent: 'Yeti-Mobile',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      // Daum / Kakao
      {
        userAgent: 'Daumoa',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/', '/login/', '/account/', '/mypage/'],
      },
      // Bing (Microsoft)
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/', '/login/', '/account/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
