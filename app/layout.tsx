import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: '정책지금 - 나에게 맞는 정부 지원금 찾기',
    template: '%s | 정책지금',
  },
  description: '최신 정부 복지 정책, 지원금, 보조금 정보를 한눈에! 생활안정, 주거, 교육, 고용, 건강 등 맞춤형 복지 서비스를 찾아보세요.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://welfare-platform-five.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '정책지금',
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover',
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
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <MobileHeader />
        <main className="min-h-screen">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
