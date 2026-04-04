import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '정책자금넷 — 정부 지원금·보조금 한눈에',
  description:
    '정부 지원금, 보조금, 환급금, 바우처 등 나에게 맞는 복지 혜택을 한눈에 확인하세요. 2026년 최신 정책 정보를 매일 업데이트합니다.',
}

const REGIONS = [
  { name: '서울', slug: 'seoul' },
  { name: '경기', slug: 'gyeonggi' },
  { name: '인천', slug: 'incheon' },
  { name: '부산', slug: 'busan' },
  { name: '대구', slug: 'daegu' },
  { name: '광주', slug: 'gwangju' },
  { name: '대전', slug: 'daejeon' },
  { name: '울산', slug: 'ulsan' },
  { name: '세종', slug: 'sejong' },
  { name: '강원', slug: 'gangwon' },
  { name: '충북', slug: 'chungbuk' },
  { name: '충남', slug: 'chungnam' },
  { name: '전북', slug: 'jeonbuk' },
  { name: '전남', slug: 'jeonnam' },
  { name: '경북', slug: 'gyeongbuk' },
  { name: '경남', slug: 'gyeongnam' },
  { name: '제주', slug: 'jeju' },
]

const CATEGORIES = [
  { name: '지원금', icon: '💰', desc: '정부·지자체 지원금' },
  { name: '보조금', icon: '🏦', desc: '사업·생활 보조금' },
  { name: '바우처', icon: '🎫', desc: '교육·돌봄·문화 바우처' },
  { name: '환급금', icon: '💸', desc: '세금·보험 환급' },
  { name: '장려금', icon: '📋', desc: '근로·자녀 장려금' },
  { name: '대출', icon: '🏠', desc: '저금리 정책 대출' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            정책자금넷
          </Link>
          <nav className="flex gap-5 text-sm text-gray-600">
            <Link href="/welfare/seoul" className="hover:text-blue-600">
              지역별
            </Link>
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            나에게 맞는 정부 지원금,<br />한눈에 확인하세요
          </h1>
          <p className="text-gray-500 mb-8">
            2026년 최신 정부 지원금·보조금·바우처·환급금 정보를 매일 업데이트합니다.
          </p>
          {/* TODO: 검색 기능 (DB 연결 후) */}
          <div className="max-w-md mx-auto">
            <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <span className="text-gray-400 mr-2">🔍</span>
              <input
                type="text"
                placeholder="지원금 검색 (예: 청년 월세, 출산 지원금)"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
                disabled
              />
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-lg font-bold text-gray-800 mb-5">분야별 정책</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="bg-gray-50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="text-2xl mb-1">{cat.icon}</div>
              <div className="text-sm font-medium text-gray-800">{cat.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">{cat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 최신 정책 (DB 연결 전 플레이스홀더) */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-lg font-bold text-gray-800 mb-5">최신 정책</h2>
        <div className="bg-gray-50 rounded-xl p-10 text-center text-gray-400 text-sm">
          데이터베이스 연결 후 최신 정책이 표시됩니다.
        </div>
      </section>

      {/* 지역별 바로가기 */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-lg font-bold text-gray-800 mb-5">지역별 정책</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Link
              key={r.slug}
              href={`/welfare/${r.slug}`}
              className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-700
                hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {r.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
          <p>&copy; 2026 정책자금넷. 본 사이트는 정보 제공 목적이며, 정확한 내용은 해당 기관에서 확인하세요.</p>
        </div>
      </footer>
    </div>
  )
}
