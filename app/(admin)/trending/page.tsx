import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'
// 5분 캐시 — 검색 유입 키워드 변동 빈도 대비 충분
export const revalidate = 300

/**
 * 검색 트렌딩 — 내부 유입 로그(PageView.referrer 의 검색 쿼리 파라미터)를
 * 기반으로 최근 7일 검색 유입 키워드 상위를 집계한다.
 *
 * ⚡️ 성능 변경 (2026-04):
 *   - 기존: findMany take:20000 → Node 메모리에서 for 루프 집계 (1~2초)
 *   - 개선: regexp_replace 로 SQL 레벨에서 추출 + GROUP BY (수십 ms)
 *   - unstable_cache 5분 TTL 으로 재방문 시 DB 히트 제로
 *   - Suspense 로 쉘 먼저 렌더, 집계는 스트리밍
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

type TopKeyword = { keyword: string; count: number }

/**
 * SQL 한 방으로 referrer 의 query string 에서 q / query / keyword / wd 파라미터를 추출하여 집계.
 * - PageView.referrer ILIKE 로 검색엔진 referrer 만 먼저 좁힘 (인덱스 사용 가능)
 * - regexp_match 로 쿼리값 추출 → LOWER + LEFT(80) 정규화
 * - GROUP BY 상위 30개만
 */
const getTopKeywords = unstable_cache(
  async (): Promise<TopKeyword[]> => {
    try {
      const rows = await prisma.$queryRawUnsafe<{ keyword: string; count: bigint }[]>(
        `
        WITH kw AS (
          SELECT
            LEFT(LOWER(
              (regexp_match(referrer, '[?&](?:q|query|keyword|wd)=([^&#]+)'))[1]
            ), 80) AS keyword
          FROM "PageView"
          WHERE
            "createdAt" >= NOW() - INTERVAL '7 days'
            AND referrer IS NOT NULL
            AND source IN ('google','naver','daum','bing','yahoo','yandex')
        )
        SELECT keyword, COUNT(*)::bigint AS count
        FROM kw
        WHERE keyword IS NOT NULL AND keyword <> ''
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 30
        `,
      )
      return rows.map(r => ({
        keyword: decodeURIComponent(r.keyword.replace(/\+/g, ' ')),
        count: Number(r.count),
      }))
    } catch {
      return []
    }
  },
  ['trending-top-keywords-v1'],
  { revalidate: 300, tags: ['trending'] },
)

async function TopKeywordsTable() {
  const keywords = await getTopKeywords()
  return (
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
                <tr key={k.keyword + idx} className="border-b border-gray-50 hover:bg-gray-50">
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
  )
}

function TopKeywordsSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-5 bg-gray-50 rounded" />
        ))}
      </div>
    </div>
  )
}

export default function TrendingPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">검색 트렌딩</h1>
        <span className="text-[10px] text-gray-400">최근 7일 유입 키워드 기반 · 5분 캐시</span>
      </div>

      {/* 실제 검색 유입 키워드 — 스트리밍 */}
      <Suspense fallback={<TopKeywordsSkeleton />}>
        <TopKeywordsTable />
      </Suspense>

      {/* 권장 키워드 카탈로그 — 정적 */}
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
