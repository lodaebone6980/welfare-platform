import { prisma } from '@/lib/prisma'
import { calcFormatStats, DEFAULT_STATS } from '@/lib/rl-engine'
import type { Format } from '@/lib/rl-engine'
import Link from 'next/link'

async function getData() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayPosts, totalPolicies, recentPolicies, recentThreads] = await Promise.all([
      prisma.threadsPost.count({ where: { publishedAt: { gte: today } } }),
      prisma.policy.count({ where: { status: 'PUBLISHED' } }),
      prisma.policy.findMany({
        where:   { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take:    5,
        include: { category: true },
      }),
      prisma.threadsPost.findMany({
        where:   { verdict: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take:    30,
      }),
    ])

    const stats = recentThreads.length >= 5
      ? calcFormatStats(recentThreads.map((p: any) => ({
          views: p.views, likes: p.likes,
          comments: p.comments, shares: p.shares,
          format: p.format as Format, verdict: p.verdict as any,
        })))
      : DEFAULT_STATS

    // 연속 발행일 계산
    let streak = 0
    const checkDate = new Date()
    while (streak < 365) {
      checkDate.setHours(0, 0, 0, 0)
      const next = new Date(checkDate)
      next.setHours(23, 59, 59, 999)
      const count = await prisma.threadsPost.count({
        where: { publishedAt: { gte: checkDate, lte: next } }
      })
      if (count === 0) break
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return { todayPosts, totalPolicies, recentPolicies, stats, streak }
  } catch {
    return {
      todayPosts: 0,
      totalPolicies: 0,
      recentPolicies: [] as any[],
      stats: DEFAULT_STATS,
      streak: 0,
    }
  }
}

export default async function DashboardPage() {
  const { todayPosts, totalPolicies, recentPolicies, stats, streak } = await getData()
  const DAILY_GOAL = 3
  const progress   = Math.min(100, Math.round(todayPosts / DAILY_GOAL * 100))
  const done       = todayPosts >= DAILY_GOAL

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800 mb-6 lg:mb-8">대시보드</h1>

      {/* 미션 + 스트릭 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className={`rounded-xl p-4 lg:p-5 border ${done ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <div className={`text-xs lg:text-sm font-medium mb-2 ${done ? 'text-green-700' : 'text-gray-500'}`}>오늘의 미션</div>
          <div className="text-2xl lg:text-3xl xl:text-4xl font-medium text-gray-800">
            {todayPosts} <span className="text-sm font-normal text-gray-400">/ {DAILY_GOAL}건</span>
          </div>
          <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className={`text-xs mt-1.5 ${done ? 'text-green-600' : 'text-gray-400'}`}>
            {done ? '완료! 오늘 발행 목표 달성' : `${DAILY_GOAL - todayPosts}건 더 발행하면 달성`}
          </div>
        </div>

        <div className="rounded-xl p-4 lg:p-5 border bg-amber-50 border-amber-200">
          <div className="text-xs font-medium text-amber-700 mb-2">발행 스트릭</div>
          <div className="text-2xl lg:text-3xl xl:text-4xl font-medium text-gray-800">
            {streak} <span className="text-sm font-normal text-amber-600">일 연속</span>
          </div>
          <div className="text-xs text-amber-600 mt-2">
            {streak >= 7 ? '7일 이상 연속 발행 중!' : `목표: 7일 연속 (${7 - streak}일 남음)`}
          </div>
        </div>
      </div>

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {[
          { label: '발행된 정책', value: totalPolicies.toLocaleString(),  sub: '누적' },
          { label: '오늘 Threads', value: todayPosts,                     sub: '발행' },
          { label: 'REWARD율',    value: `${stats[0]?.rewardRate ?? 0}%`, sub: '7일 기준' },
          { label: '최고 포맷',   value: stats[0]?.format ?? '-',         sub: `평균 ${stats[0]?.avgViews ?? 0}조회` },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-lg sm:text-xl font-medium text-gray-800">{m.value}</div>
            <div className="text-[10px] sm:text-xs text-green-600 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Link href="/content/policy" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-blue-700">정책 관리</div>
          <div className="text-[10px] text-gray-400 mt-0.5">목록 / 검색 / 편집</div>
        </Link>
        <Link href="/marketing/threads" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-green-200 hover:bg-green-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-green-700">Threads 발행</div>
          <div className="text-[10px] text-gray-400 mt-0.5">AI 생성 / 발행</div>
        </Link>
        <Link href="/content/bulk" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-purple-200 hover:bg-purple-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-purple-700">GEO 대량생성</div>
          <div className="text-[10px] text-gray-400 mt-0.5">17개 시도 자동</div>
        </Link>
        <Link href="/api-status" className="bg-white border border-gray-100 rounded-xl p-3 hover:border-amber-200 hover:bg-amber-50 transition-colors group">
          <div className="text-xs font-medium text-gray-700 group-hover:text-amber-700">API 현황</div>
          <div className="text-[10px] text-gray-400 mt-0.5">수집 상태 모니터링</div>
        </Link>
      </div>

      {/* 최근 정책 + RL 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-gray-600">최근 발행 정책</div>
            <Link href="/content/policy" className="text-[10px] text-blue-500 hover:underline">전체보기</Link>
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
                  {recentPolicies.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-700 max-w-[200px] truncate">{p.title}</td>
                      <td className="py-2 text-gray-400 hidden sm:table-cell">{p.category?.name ?? '-'}</td>
                      <td className="py-2 text-right text-gray-500">{p.viewCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-medium text-gray-600 mb-3">RL 학습 요약 (7일)</div>
          <div className="space-y-2">
            {stats.map((s) => (
              <div key={s.format} className="flex items-center gap-2 sm:gap-3">
                <span className="w-14 sm:w-16 text-xs text-gray-500 flex-shrink-0 truncate">{s.format}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${Math.min(100, (s.avgViews / (stats[0]?.avgViews || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-gray-400 w-10 sm:w-12 text-right flex-shrink-0">
                  {s.avgViews}
                </span>
                <span className={`text-[10px] sm:text-xs w-7 sm:w-8 text-right flex-shrink-0 ${s.rewardRate >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                  {s.rewardRate}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-blue-600">
            추천: {stats[0]?.format ?? '-'} + {stats[1]?.format ?? '-'} 위주 발행
          </div>
        </div>
      </div>
    </div>
  )
}
