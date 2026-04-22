import Link from 'next/link'
import {
  getTodayKpis,
  getSourceDistribution,
  getDeviceDistribution,
  getPlatformDistribution,
  getDailySourceSeries,
  getTopPages,
  getPv,
  getUv,
  type Range,
} from '@/lib/traffic-stats'
import TrafficCharts from './TrafficCharts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: '24시간', value: '24h' },
  { label: '7일',   value: '7d'  },
  { label: '30일',  value: '30d' },
  { label: '90일',  value: '90d' },
]

const SOURCE_LABEL: Record<string, string> = {
  direct: '직접 방문',
  google: '구글',
  naver: '네이버',
  bing: '빙',
  daum: '다음',
  yahoo: '야후',
  yandex: '얀덱스',
  facebook: '페이스북',
  threads: 'Threads',
  x: 'X(트위터)',
  instagram: '인스타그램',
  kakao: '카카오',
  youtube: '유튜브',
  tiktok: '틱톡',
  linkedin: '링크드인',
  reddit: '레딧',
  other: '기타',
}

function label(source: string) {
  return SOURCE_LABEL[source] ?? source
}

export default async function TrafficPage({
  searchParams,
}: {
  searchParams?: { range?: string }
}) {
  const rangeRaw = (searchParams?.range ?? '7d') as Range
  const range: Range = (['24h', '7d', '30d', '90d'] as const).includes(rangeRaw as any)
    ? (rangeRaw as Range)
    : '7d'

  const [
    today,
    sources,
    devices,
    platforms,
    daily,
    topPages,
    pv,
    uv,
  ] = await Promise.all([
    getTodayKpis(),
    getSourceDistribution(range),
    getDeviceDistribution(range),
    getPlatformDistribution(range),
    getDailySourceSeries(range),
    getTopPages(range, 10),
    getPv(range),
    getUv(range),
  ])

  type SourceCount = { source: string; count: number }
  const directToday = today.sourcesToday.find((s: SourceCount) => s.source === 'direct')?.count ?? 0
  const googleToday = today.sourcesToday.find((s: SourceCount) => s.source === 'google')?.count ?? 0
  const xToday      = today.sourcesToday.find((s: SourceCount) => s.source === 'x')?.count ?? 0
  const naverToday  = today.sourcesToday.find((s: SourceCount) => s.source === 'naver')?.count ?? 0

  const totalRange = sources.reduce((a: number, b: SourceCount) => a + b.count, 0)

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">유입 분석</h1>
        <div className="flex items-center gap-1 text-xs">
          {RANGE_OPTIONS.map(opt => (
            <Link
              key={opt.value}
              href={`/traffic?range=${opt.value}`}
              className={[
                'px-2.5 py-1 rounded-md border transition-colors',
                opt.value === range
                  ? 'bg-green-50 border-green-200 text-green-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 오늘 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="오늘 페이지뷰" value={today.pvToday} suffix="회" accent="text-green-600" />
        <KpiCard label="오늘 UV"       value={today.uvToday} suffix="명" accent="text-blue-600" />
        <KpiCard label="직접 방문"     value={directToday}   suffix="회" accent="text-gray-500" />
        <KpiCard label="구글 유입"     value={googleToday}   suffix="회" accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label={`기간 PV (${range})`} value={pv}         suffix="회" accent="text-gray-700" />
        <KpiCard label={`기간 UV (${range})`} value={uv}         suffix="명" accent="text-gray-700" />
        <KpiCard label="네이버 유입"          value={naverToday} suffix="회" accent="text-emerald-600" />
        <KpiCard label="X(트위터) 유입"       value={xToday}     suffix="회" accent="text-sky-600" />
      </div>

      {/* 도넛 + 라인 */}
      <TrafficCharts
        sources={sources.map((s: SourceCount) => ({ source: s.source, label: label(s.source), count: s.count }))}
        devices={devices}
        platforms={platforms}
        daily={daily}
        totalRange={totalRange}
        range={range}
      />

      {/* Top 페이지 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-600">인기 페이지 (기간 기준 Top 10)</div>
          <div className="text-[10px] text-gray-400">{range}</div>
        </div>
        {topPages.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            아직 수집된 페이지뷰가 없습니다. 사이트에 접속이 발생하면 여기 집계됩니다.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[320px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal">경로</th>
                  <th className="text-left py-1.5 font-normal hidden sm:table-cell">타이틀</th>
                  <th className="text-right py-1.5 font-normal">PV</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p: { path: string; count: number; title?: string | null }) => (
                  <tr key={p.path} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 text-gray-700 max-w-[240px] truncate">{p.path}</td>
                    <td className="py-2 text-gray-400 hidden sm:table-cell max-w-[320px] truncate">{p.title ?? '-'}</td>
                    <td className="py-2 text-right text-gray-500">{p.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 mt-4">
        * 관리자/내부 경로(/dashboard, /content, /api-status, /traffic, /marketing, /api 등)는 수집 대상에서 제외됩니다.
      </p>
    </div>
  )
}

function KpiCard({
  label,
  value,
  suffix,
  accent,
}: {
  label: string
  value: number
  suffix?: string
  accent?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg sm:text-xl font-medium text-gray-800">
        {value.toLocaleString()}{suffix ? <span className="text-xs text-gray-400 ml-0.5">{suffix}</span> : null}
      </div>
      <div className={`text-[10px] sm:text-xs mt-1 ${accent ?? 'text-gray-500'}`}>실시간 집계</div>
    </div>
  )
}
