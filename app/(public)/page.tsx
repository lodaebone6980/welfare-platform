import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { autoSeedIfEmpty } from '@/lib/auto-seed'
import { PolicyFeed } from '@/components/home/PolicyFeed'

export const metadata: Metadata = {
  title: '정책자금넷 — 정부 지원금·보조금 한눈에',
  description:
    '정부 지원금, 보조금, 환급금, 바우처 등 나에게 맞는 복지 혜택을 한눈에 확인하세요. 2026년 최신 정책 정보를 매일 업데이트합니다.',
}

export const revalidate = 3600 // 1시간 ISR

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

async function getPolicies() {
  // DB가 비어있으면 자동 시드
  await autoSeedIfEmpty()

  const policies = await prisma.policy.findMany({
    where:   { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take:    30,
    include: { category: true },
  })

  return policies.map(p => ({
    id:          p.id,
    slug:        p.slug,
    title:       p.title,
    excerpt:     p.excerpt,
    category:    p.category,
    geoRegion:   p.geoRegion,
    applyUrl:    p.applyUrl,
    viewCount:   p.viewCount,
    publishedAt: p.publishedAt?.toISOString() ?? null,
  }))
}

export default async function HomePage() {
  const policies = await getPolicies()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-blue-600">
            정책자금넷
          </Link>
          <nav className="flex gap-4 text-sm text-gray-500">
            <Link href="/welfare/seoul" className="hover:text-blue-600 hidden sm:block">지역별</Link>
            <Link href="/dashboard" className="hover:text-blue-600 text-xs px-2 py-1 bg-gray-100 rounded">관리자</Link>
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="bg-gradient-to-b from-blue-50 to-gray-50 pt-10 pb-6">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
            나에게 맞는 정부 지원금
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            2026년 최신 정부 지원금·보조금·바우처·환급금 정보
          </p>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <PolicyFeed policies={policies} />
      </section>

      {/* 지역별 바로가기 */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">지역별 정책</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(r => (
            <Link
              key={r.slug}
              href={`/welfare/${r.slug}`}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600
                hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
            >
              {r.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-xs text-gray-400">
          <p>&copy; 2026 정책자금넷. 본 사이트는 정보 제공 목적이며, 정확한 내용은 해당 기관에서 확인하세요.</p>
        </div>
      </footer>
    </div>
  )
}
