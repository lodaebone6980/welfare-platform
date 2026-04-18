import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
          '/dashboard',
          '/content/',
          '/api-status',
          '/traffic',
          '/trending',
          '/marketing/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
      {
        userAgent: 'bingbot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      {
        userAgent: 'Yeti', // Naver
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      {
        userAgent: 'NaverBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      {
        userAgent: 'Daumoa', // Daum / Kakao
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/_next/'],
      },
      // AI 크롤러 — 수익/저작권 보호 관점에서 차단
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'OAI-SearchBot', allow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Claude-Web', disallow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: baseUrl + '/sitemap.xml',
    host: baseUrl,
  }
}
