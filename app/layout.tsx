import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/auth/SessionProvider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

// SEO/GEO/AEO: 운영 도메인 단일 소스 (구 Vercel preview 폐기)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: {
    default: '복지길잡이 – 나에게 맞는 정부 지원금 찾기',
    template: '%s | 복지길잡이',
  },
  description:
    '2026년 최신 정부 복지 정책, 지원금, 보조금, 환급금 정보를 한눈에. 나에게 맞는 복지 정책을 AI가 추천해드립니다.',
  keywords: [
    '정부지원금',
    '복지정책',
    '보조금',
    '환급금',
    '청년지원금',
    '아동수당',
    '기초생활수급',
    '주거지원',
    '교육보조금',
  ],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '복지길잡이',
    url: SITE_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  // 검색엔진 사이트 소유확인 메타태그
  verification: {
    other: {
      'naver-site-verification': 'b8e25342861cc0030a76dbc99c6d2a5525a0693e',
    },
  },
};

// JSON-LD structured data (운영 도메인으로 일관성)
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: '복지길잡이',
      url: SITE_URL,
      description: '나에게 맞는 정부 지원금을 찾아보세요',
      inLanguage: 'ko-KR',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/welfare/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: '복지길잡이',
      url: SITE_URL,
      sameAs: [],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="dns-prefetch" href="//aws-1-ap-south-1.pooler.supabase.com" />
        <link rel="preconnect" href="https://aws-1-ap-south-1.pooler.supabase.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
