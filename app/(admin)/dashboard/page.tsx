import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  try {
    const [
      totalPolicies,
      todayNewPolicies,
      weekUpdatedPolicies,
      draftPolicies,
      todayThreads,
      recentPolicies,
      apiSources,
      recentRuns,
    ] = await Promise.all([
      prisma.policy.count({ where: { status: 'PUBLISHED' } }),
      prisma.policy.count({ where: { status: 'PUBLISHED', createdAt: { gte: today } } }),
      prisma.policy.count({ where: { updatedAt: { gte: weekAgo } } }),
      prisma.policy.count({ where: { status: { in: ['DRAFT', 'REVIEW'] } } }),
      prisma.threadsPost.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
      prisma.policy.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        include: { category: true },
      }),
      (prisma as any).apiSource?.findMany({ orderBy: { name: 'asc' } }).catch(() => []) ?? [],
      (prisma as any).collectionRun?.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { source: true },
      }).catch(() => []) ?? [],
    ])

    return {
      totalPolicies,
      todayNewPolicies,
      weekUpdatedPolicies,
      draftPolicies,
      todayThreads,
      recentPolicies,
      apiSources: apiSources || [],
      recentRuns: recentRuns || [],
    }
  } catch {
    return {
      totalPolicies: 0,
      todayNewPolicies: 0,
      weekUpdatedPolicies: 0,
      draftPolicies: 0,
      todayThreads: 0,
      recentPolicies: [] as any[],
      apiSources: [] as any[],
      recentRuns: [] as any[],
    }
  }
}

function statusBadge(status: string | null | undefined) {
  if (status === 'success') return <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">성공</span>
  if (status === 'error') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600">실패</span>
  if (status === 'running') return <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">실행중</span>
  if (status === 'partial') return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">부분</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">-</span>
}

function relativeTime(d: Date | string | null | undefined) {
  if (!d) return '-'
  const date = new Date(d)
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24)
  return `${day}일 전`
}

export default async function DashboardPage() {
  const {
    totalPolicies,
    todayNewPolicies,
    weekUpdatedPolicies,
    draftPolicies,
    todayThreads,
    recentPolicies,
    apiSources,
    recentRuns,
  } = await getData()

  const kpis = [
    { label: '발행 정책', value: totalPolicies.toLocaleString(), sub: '전체 누적', href: '/content/policy', color: 'text-gray-800' },
    { label: '오늘 신규', value: todayNewPolicies.toLocaleString(), sub: '오늘 발행', href: '/content/policy?status=published', color: 'text-emerald-600' },
    { label: '7일 업데이트', value: weekUpdatedPolicies.toLocaleString(), sub: '최근 7일', href: '/content/policy', color: 'text-blue-600' },
    { label: '검토 대기', value: draftPolicies.toLocaleString(), sub: '초안·검토중', href: '/content/policy?status=draft', color: 'text-amber-600' },
    { label: '오늘 Threads', value: todayThreads.toLocaleString(), sub: '발행', href: '/marketing/threads', color: 'text-purple-600' },
    { label: 'API 소스', value: apiSources.length.toString(), sub: '등록된 소스', href: '/api-status', color: 'text-indigo-600' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-end justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800">대시보드</h1>
          <p className="text-xs text-gray-500 mt-1">콘텐츠 · API 수집 · 유입 핵심 지표 요약</p>
        </div>
        <Link href="/analytics" className="text-xs text-blue-600 hover:underline">유입 분석 →</Link>
      </div>

      {/* KPI 6개 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{k.label}</div>
            <div className={`text-lg sm:text-xl lg:text-2xl font-medium ${k.color}`}>{k.value}</div>
            <div className="text-[10px] sm:text-xs text-gray-400 mt-1">{k.sub}</div>
          </Link>
        ))}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 lg:mb-8">
        <Link href="/content/policy" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-blue-700">정책 관리</div>
          <div className="text-[10px] text-gray-400 mt-0.5">목록 / 검색 / 편집</div>
        </Link>
        <Link href="/content/category" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-emerald-700">카테고리 관리</div>
          <div className="text-[10px] text-gray-400 mt-0.5">분류 · SEO 설정</div>
        </Link>
        <Link href="/api-status" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-amber-200 hover:bg-amber-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-amber-700">API 수집</div>
          <div className="text-[10px] text-gray-400 mt-0.5">복지로 · 정부24</div>
        </Link>
        <Link href="/search-trending" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-rose-200 hover:bg-rose-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-rose-700">검색 트렌딩</div>
          <div className="text-[10px] text-gray-400 mt-0.5">RSS · 인기 키워드</div>
        </Link>
      </div>

      {/* API 수집 요약 + 최근 발행 정책 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* API 수집 요약 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-gray-600">API 수집 상태</div>
            <Link href="/api-status" className="text-[10px] text-blue-500 hover:underline">전체 →</Link>
          </div>
          {apiSources.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              등록된 API 소스가 없습니다.<br />
              <span className="text-amber-600">마이그레이션 SQL 실행 필요</span>
            </div>
          ) : (
            <div className="space-y-2">
              {apiSources.slice(0, 4).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">{s.name}</span>
                    {statusBadge(s.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">오늘 {s.todayCount ?? 0}건</div>
                    <div className="text-[10px] text-gray-400">{relativeTime(s.lastSuccess)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {recentRuns.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[10px] text-gray-400 mb-2">최근 실행</div>
              <div className="space-y-1">
                {recentRuns.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-600 truncate">{r.source?.name ?? '-'}</span>
                    <span className="flex items-center gap-2">
                      {statusBadge(r.status)}
                      <span className="text-gray-400">{relativeTime(r.startedAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 최근 발행 정책 */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-gray-600">최근 발행 정책</div>
            <Link href="/content/policy" className="text-[10px] text-blue-500 hover:underline">전체 →</Link>
          </div>
          {recentPolicies.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">아직 발행된 정책이 없습니다</div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 font-normal">정책명</th>
                    <th className="text-left py-1.5 font-normal hidden sm:table-cell">카테고리</th>
                    <th className="text-right py-1.5 font-normal">조회</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPolicies.slice(0, 8).map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-700 max-w-[200px] truncate">
                        <Link href={`/content/policy/${p.id}/edit`} className="hover:text-blue-600">{p.title}</Link>
                      </td>
                      <td className="py-2 text-gray-400 hidden sm:table-cell">{p.category?.name ?? '-'}</td>
                      <td className="py-2 text-right text-gray-500">{(p.viewCount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="mt-6 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-[11px] text-gray-500">
        * 유입·검색 트렌딩 등 추가 지표는 해당 메뉴에서 자세히 확인할 수 있습니다.
        웹마스터 도구(Google Search Console · Naver Search Advisor)는 연결 후 본 대시보드에 자동 반영됩니다.
      </div>
    </div>
  )
}
