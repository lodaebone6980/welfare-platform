import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: '정책자금넷 — 정부 지원금·보조금 한눈에',
    template: '%s | 정책자금넷',
  },
  description:
    '정부 지원금, 보조금, 환급금, 바우처 등 나에게 맞는 복지 혜택을 한눈에 확인하세요.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'https://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '정책자금넷',
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* AdSense */}
        {process.env.ADSENSE_PUB_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.ADSENSE_PUB_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
