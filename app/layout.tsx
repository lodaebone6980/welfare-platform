import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';

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
  description: '\uCD5C\uC2E0 \uC815\uBD80 \uBCF5\uC9C0 \uC815\uCC45, \uC9C0\uC6D0\uAE08, \uBCF4\uC870\uAE08 \uC815\uBCF4\uB97C \uD55C\uB208\uC5D0! \uC0DD\uD65C\uC548\uC815, \uC8FC\uAC70, \uAD50\uC721, \uACE0\uC6A9, \uAC74\uAC15 \uB4F1 \uB9DE\uCDA4\uD615 \uBCF5\uC9C0 \uC11C\uBE44\uC2A4\uB97C \uCC3E\uC544\uBCF4\uC138\uC694.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://welfare-platform-five.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '\uC815\uCC45\uC9C0\uAE08',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="dns-prefetch" href="//aws-1-ap-south-1.pooler.supabase.com" />
        <link rel="preconnect" href="https://aws-1-ap-south-1.pooler.supabase.com" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <MobileHeader />
        <main className="min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
