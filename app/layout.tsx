import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '복지 플랫폼',
  description: '복지 서비스 정보 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
