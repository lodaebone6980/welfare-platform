import { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://welfare-platform-five.vercel.app';

/**
 * robots.txt
 *
 * 한국 환경에서 필수:
 *  - Yeti (네이버)
 *  - Daumoa (다음/카카오)
 *  - Googlebot (구글)
 *  - bingbot (빙, Edge)
 *
 * sitemap 선언은 index 파일 1개면 충분. index가 각 서브 sitemap 참조.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/', '/mypage'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      {
        userAgent: 'Yeti', // 네이버
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      {
        userAgent: 'Daumoa', // 다음/카카오
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      {
        userAgent: 'bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/', '/dashboard/'],
      },
      // AI 크롤러 (허용하면 GEO 노출 확률↑. 원치 않으면 disallow)
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
    ],
    sitemap: [
      BASE_URL + '/sitemap.xml',
      BASE_URL + '/rss.xml',
      BASE_URL + '/feed.xml',
    ],
    host: BASE_URL,
  };
}
