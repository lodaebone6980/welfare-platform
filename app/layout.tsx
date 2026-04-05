import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';
import AppSmartBanner from '@/components/layout/AppSmartBanner';
import SessionProvider from '@/components/auth/SessionProvider';
import ChannelTalk from '@/components/layout/ChannelTalk';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: {
    default: '\uC815\uCC45\uC9C0\uAE08 \u2013 \uB098\uC5D0\uAC8C \uB9DE\uB294 \uC815\uBD80 \uC9C0\uC6D0\uAE08 \uCC3E\uAE30',
    template: '%s | \uC815\uCC45\uC9C0\uAE08',
  },
  description: '2025\uB144 \uCD5C\uC2E0 \uC815\uBD80 \uBCF5\uC9C0 \uC815\uCC45, \uC9C0\uC6D0\uAE08, \uBCF4\uC870\uAE08, \uD658\uAE09\uAE08 \uC815\uBCF4\uB97C \uD55C\uB208\uC5D0. \uB098\uC5D0\uAC8C \uB9DE\uB294 \uBCF5\uC9C0 \uC815\uCC45\uC744 AI\uAC00 \uCD94\uCC9C\uD574\uB4DC\uB9BD\uB2C8\uB2E4.',
  keywords: ['\uC815\uBD80\uC9C0\uC6D0\uAE08', '\uBCF5\uC9C0\uC815\uCC45', '\uBCF4\uC870\uAE08', '\uD658\uAE09\uAE08', '\uCCAD\uB144\uC9C0\uC6D0\uAE08', '\uC544\uB3D9\uC218\uB2F9', '\uAE30\uCD08\uC0DD\uD65C\uC218\uAE09', '\uC8FC\uAC70\uC9C0\uC6D0', '\uAD50\uC721\uBCF4\uC870\uAE08'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://welfare-platform-five.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '\uC815\uCC45\uC9C0\uAE08',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

// JSON-LD structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: '\uC815\uCC45\uC9C0\uAE08',
      url: 'https://welfare-platform-five.vercel.app',
      description: '\uB098\uC5D0\uAC8C \uB9DE\uB294 \uC815\uBD80 \uC9C0\uC6D0\uAE08\uC744 \uCC3E\uC544\uBCF4\uC138\uC694',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://welfare-platform-five.vercel.app/welfare/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: '\uC815\uCC45\uC9C0\uAE08',
      url: 'https://welfare-platform-five.vercel.app',
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
            <AppSmartBanner />
        <MobileHeader />
        <main className="min-h-screen">{children}</main>
        <BottomNav />
            <ChannelTalk />
          </SessionProvider>
      </body>
    </html>
  );
}
