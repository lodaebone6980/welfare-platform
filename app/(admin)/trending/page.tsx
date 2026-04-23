import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * 검색 트렌딩 — 내부 유입 로그(PageView.referrer의 검색어, q= / query= / keyword= 파라미터)를
 * 기반으로 최근 7일 검색 유입 키워드 상위를 집계한다.
 * 수집된 로그가 없으면 기본 추천 키워드를 보여준다.
 */

const DEFAULT_KEYWORDS: { keyword: string; category: string; reason: string }[] = [
  { keyword: '청년 월세 지원',        category: '주거',   reason: '상시 고관여 키워드' },
  { keyword: '기초생활수급자 혜택',   category: '복지',   reason: '생애 주기형' },
  { keyword: '아동수당 2026',         category: '가족',   reason: '연도 변경 시 트래픽 급증' },
  { keyword: '소상공인 정책자금',      category: '소상공인', reason: '캠페인 시즌' },
  { keyword: '근로장려금 신청',        category: '세금',   reason: '5월 피크' },
  { keyword: '자녀장려금',            category: '세금',   reason: '근로장려금과 연동' },
  { keyword: '전기차 보조금 2026',    category: '친환경', reason: '분기별 조회 폭주' },
  { keyword: '국민내일배움카드',       category: '교육',   reason: '상시 광고 매칭' },
  { keyword: '청년도약계좌',          category: '금융',   reason: '상시 고관여' },
  { keyword: '난방비 지원 에너지바우처', category: '복지',   reason: '겨울철 집중' },
]

function parseSearchKeyword(referrer: string | null): string | null {
  if (!referrer) return null
  try {
    const u = new URL(referrer)
    const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('keyword') || u.searchParams.get('wd')
    if (q && q.trim().length > 0) return q.trim().toLowerCase().slice(0, 80)
    return null
  } catch {
    return null
  }
}

async function getTopKeywords() {
  try {
    const anyPrisma = prisma as any
    if (!anyPrisma.pageView) return [] as { keyword: string; count: number }[]
    const from = new Date()
    from.setDate(from.getDate() - 7)
    const rows = await anyPrisma.pageView.findMany({
      where: {
        createdAt: { gte: from },
        referrer: { not: null },
        source: { in: ['google', 'naver', 'daum', 'bing', 'yahoo', 'yandex'] },
      },
      select: { referrer: true },
      take: 20000,
    })
    const map = new Map<string, number>()
    for (let i = 0; i < rows.length; i++) {
      const kw = parseSearchKeyword(rows[i].referrer)
      if (!kw) continue
      map.set(kw, (map.get(kw) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(pair => ({ keyword: pair[0], count: pair[1] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)
  } catch {
    return []
  }
}

export default async function TrendingPage() {
  const keywords = await getTopKeywords()

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">검색 트렌딩</h1>
        <span className="text-[10px] text-gray-400">최근 7일 유입 키워드 기반</span>
      </div>

      {/* 실제 검색 유입 키워드 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
        <div className="text-xs font-medium text-gray-600 mb-3">검색 유입 키워드 Top 30</div>
        {keywords.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            아직 검색 유입이 감지되지 않았습니다. 수집이 쌓이면 자동으로 채워집니다.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[320px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal w-10">#</th>
                  <th className="text-left py-1.5 font-normal">키워드</th>
                  <th className="text-right py-1.5 font-normal">유입수</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k, idx) => (
                  <tr key={k.keyword} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-400">{idx + 1}</td>
                    <td className="py-2 text-gray-700">{k.keyword}</td>
                    <td className="py-2 text-right text-gray-500">{k.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 권장 키워드 카탈로그 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-xs font-medium text-gray-600 mb-3">상시 공략 추천 키워드 (SEO · GEO · AEO)</div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-normal">키워드</th>
                <th className="text-left py-1.5 font-normal">카테고리</th>
                <th className="text-left py-1.5 font-normal hidden sm:table-cell">사유</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_KEYWORDS.map(k => (
                <tr key={k.keyword} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-700">{k.keyword}</td>
                  <td className="py-2 text-gray-500">{k.category}</td>
                  <td className="py-2 text-gray-400 hidden sm:table-cell">{k.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
