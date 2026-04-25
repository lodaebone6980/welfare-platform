import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';
import SessionProvider from '@/components/auth/SessionProvider';
import ChannelTalk from '@/components/layout/ChannelTalk';
import Footer from '@/components/common/Footer';
import Tracker from '@/components/analytics/Tracker';
import GA4 from '@/components/analytics/GA4';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESC,
  GA_ID,
  GOOGLE_SITE_VERIFICATION,
  NAVER_SITE_VERIFICATION,
  BING_SITE_VERIFICATION,
  INTERNAL_TRACKER_ENABLED,
} from '@/lib/env';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#16a34a',
};

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} – 2026 정부지원금·복지·보조금·환급금 안내`,
    template: `%s`,
  },
  description: SITE_DESC,
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
    '소상공인 지원',
    '지원금길잡이',
  ],
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} – 2026 정부지원금·복지 정보`,
    description: SITE_DESC,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME}`,
    description: SITE_DESC,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  verification: {
    google: GOOGLE_SITE_VERIFICATION || undefined,
    other: {
      ...(NAVER_SITE_VERIFICATION ? { 'naver-site-verification': NAVER_SITE_VERIFICATION } : {}),
      ...(BING_SITE_VERIFICATION ? { 'msvalidate.01': BING_SITE_VERIFICATION } : {}),
    },
  },
};

// JSON-LD structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESC,
      inLanguage: 'ko-KR',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/welfare/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/og-image.png`,
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <MobileHeader />
          <main className="min-h-screen bg-gray-50">
            {/*
              컨테이너 폭 제한은 (public) / (admin) 레이아웃에서 각각 처리한다.
              - (public): max-w-3xl (모바일 우선 공개 페이지)
              - (admin):  max-w-[1600px] (데스크톱 대시보드)
              루트에서 폭을 고정하면 어드민이 모바일 사이즈로 렌더된다.
            */}
            {children}
            <Footer />
          </main>
          <BottomNav />
          <ChannelTalk />
        </SessionProvider>
        <Suspense fallback={null}>
          <Tracker enabled={INTERNAL_TRACKER_ENABLED} />
          {GA_ID ? <GA4 gaId={GA_ID} /> : null}
        </Suspense>
      </body>
    </html>
  );
}
