import Link from 'next/link';

export const metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 bg-white">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4" aria-hidden>🧭</div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">페이지를 찾을 수 없어요</h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          요청하신 주소가 삭제되었거나, 실수로 잌못 입력되었을 수 있습니다.
          우리가 다른 도움이 될 수 있도록 온길을 안내해드릴게요.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/" className="inline-flex items-center justify-center h-11 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
            홈으로 돌아가기
          </Link>
          <Link href="/welfare/search" className="inline-flex items-center justify-center h-11 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
            복지 정책 검색
          </Link>
        </div>

        <div className="mt-8 text-xs text-gray-400">
          <Link href="/welfare/categories" className="hover:text-gray-600 underline">카테고리별 보기</Link>
          <span className="mx-2">·</span>
          <Link href="/recommend" className="hover:text-gray-600 underline">맞춤 추천받기</Link>
        </div>
      </div>
    </main>
  );
}
