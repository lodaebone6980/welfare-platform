import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '맞춤 정책 찾기',
  robots: { index: false, follow: true },
};

export default function RecommendLayout({ children }: { children: React.ReactNode }) {
  return children;
}
