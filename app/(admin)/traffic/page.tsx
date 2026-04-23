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
  getChannelDistribution,
  bucketizeChannels,
  getTopCampaigns,
  getReferrerDomains,
  getPaidSummary,
  type Range,
} from '@/lib/traffic-stats'
import { CHANNEL_LABEL, type Channel } from '@/lib/tracking'
import TrafficCharts from './TrafficCharts'
import SourceDetailsGrid from './SourceDetailsGrid'

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

  // ⚡ 서버에서는 핵심 지표 12개만 병렬 조회 (캐시 히트 시 거의 즉시).
  //    9개 소스 상세 카드는 클라이언트가 useEffect + /api/admin/traffic/source-detail 로 지연 로드.
  const [
    today,
    sources,
    devices,
    platforms,
    daily,
    topPages,
    pv,
    uv,
    channels,
    campaigns,
    referrers,
    paidSummary,
  ] = await Promise.all([
    getTodayKpis(),
    getSourceDistribution(range),
    getDeviceDistribution(range),
    getPlatformDistribution(range),
    getDailySourceSeries(range),
    getTopPages(range, 10),
    getPv(range),
    getUv(range),
    getChannelDistribution(range),
    getTopCampaigns(range, 15),
    getReferrerDomains(range, 10),
    getPaidSummary(range),
  ])

  // channels를 재사용하여 7버킷 롤업 — 추가 쿼리 없음.
  const paidOrganic = bucketizeChannels(channels)

  type SourceCount = { source: string; count: number }
  const directToday = today.sourcesToday.find((s: SourceCount) => s.source === 'direct')?.count ?? 0
  const googleToday = today.sourcesToday.find((s: SourceCount) => s.source === 'google')?.count ?? 0
  const xToday      = today.sourcesToday.find((s: SourceCount) => s.source === 'x')?.count ?? 0
  const naverToday  = today.sourcesToday.find((s: SourceCount) => s.source === 'naver')?.count ?? 0

  const totalRange = sources.reduce((a: number, b: SourceCount) => a + b.count, 0)
  const totalBucket = paidOrganic.paid + paidOrganic.organicSearch + paidOrganic.socialOrganic + paidOrganic.direct + paidOrganic.referral + paidOrganic.email + paidOrganic.other
  const pct = (v: number) => (totalBucket > 0 ? Math.round((v / totalBucket) * 1000) / 10 : 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
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

      {/* 유료 vs 자연 vs 소셜 vs 직접 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-600">채널 요약 (기간 {range})</div>
          <div className="text-[10px] text-gray-400">총 {totalBucket.toLocaleString()} PV</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 text-center">
          <BucketCard label="유료 광고"      value={paidOrganic.paid}          pctVal={pct(paidOrganic.paid)}          color="bg-red-50 text-red-700" />
          <BucketCard label="자연 검색"      value={paidOrganic.organicSearch} pctVal={pct(paidOrganic.organicSearch)} color="bg-amber-50 text-amber-700" />
          <BucketCard label="소셜"           value={paidOrganic.socialOrganic} pctVal={pct(paidOrganic.socialOrganic)} color="bg-purple-50 text-purple-700" />
          <BucketCard label="직접 방문"      value={paidOrganic.direct}        pctVal={pct(paidOrganic.direct)}        color="bg-gray-50 text-gray-700" />
          <BucketCard label="레퍼럴"         value={paidOrganic.referral}      pctVal={pct(paidOrganic.referral)}      color="bg-blue-50 text-blue-700" />
          <BucketCard label="이메일"         value={paidOrganic.email}         pctVal={pct(paidOrganic.email)}         color="bg-indigo-50 text-indigo-700" />
          <BucketCard label="기타"           value={paidOrganic.other}         pctVal={pct(paidOrganic.other)}         color="bg-slate-50 text-slate-600" />
        </div>
      </div>

      {/* 채널 세부 (paid_search_google / organic_search_naver …) */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
        <div className="text-xs font-medium text-gray-600 mb-3">채널 세부 분포 (paid/organic × 소스)</div>
        {channels.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">아직 수집된 채널 데이터가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[380px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal">채널</th>
                  <th className="text-right py-1.5 font-normal">PV</th>
                  <th className="text-right py-1.5 font-normal w-16">%</th>
                  <th className="text-left py-1.5 font-normal pl-3 hidden sm:table-cell">점유</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(c => {
                  const p = totalBucket > 0 ? (c.count / totalBucket) * 100 : 0
                  return (
                    <tr key={c.channel} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 text-gray-700">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${channelDotColor(c.channel)}`} />
                        {CHANNEL_LABEL[c.channel]}
                      </td>
                      <td className="py-1.5 text-right text-gray-500">{c.count.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-gray-400">{p.toFixed(1)}</td>
                      <td className="py-1.5 pl-3 hidden sm:table-cell">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${channelBarColor(c.channel)}`} style={{ width: `${Math.min(100, p)}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 도넛 + 라인 (기존 차트) */}
      <TrafficCharts
        sources={sources.map((s: SourceCount) => ({ source: s.source, label: label(s.source), count: s.count }))}
        devices={devices}
        platforms={platforms}
        daily={daily}
        totalRange={totalRange}
        range={range}
      />

      {/* 소스별 상세 카드 (lazy-load 클라이언트) */}
      <SourceDetailsGrid range={range} />

      {/* 유료 캠페인 요약 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-600">유료 캠페인 요약</div>
          <div className="text-[10px] text-gray-400">
            유료 PV {paidSummary.paidPv.toLocaleString()} · UV {paidSummary.paidUv.toLocaleString()}
          </div>
        </div>
        {paidSummary.topCampaigns.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            아직 유료 캠페인 유입이 감지되지 않았습니다. <br className="hidden sm:block" />
            광고 URL 에 <code className="bg-gray-100 px-1 rounded">utm_source</code>/<code className="bg-gray-100 px-1 rounded">utm_medium=cpc</code>/<code className="bg-gray-100 px-1 rounded">utm_campaign</code> 을 추가하거나,
            광고 플랫폼의 자동 태깅(gclid, fbclid, msclkid, ttclid)으로 감지됩니다.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[360px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal">캠페인</th>
                  <th className="text-left py-1.5 font-normal">소스</th>
                  <th className="text-right py-1.5 font-normal">PV</th>
                </tr>
              </thead>
              <tbody>
                {paidSummary.topCampaigns.map((c, i) => (
                  <tr key={`${c.campaign}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700 truncate max-w-[220px]">{c.campaign}</td>
                    <td className="py-1.5 text-gray-500">{label(c.source)}</td>
                    <td className="py-1.5 text-right text-gray-500">{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 전체 UTM 캠페인 Top 15 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-5">
        <div className="text-xs font-medium text-gray-600 mb-3">UTM 캠페인 Top 15 (전체)</div>
        {campaigns.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">
            utm_campaign 파라미터가 붙은 유입이 아직 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal">캠페인</th>
                  <th className="text-left py-1.5 font-normal">Source</th>
                  <th className="text-left py-1.5 font-normal">Medium</th>
                  <th className="text-right py-1.5 font-normal">PV</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={`${c.campaign}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700 truncate max-w-[240px]">{c.campaign}</td>
                    <td className="py-1.5 text-gray-500">{c.source}</td>
                    <td className="py-1.5 text-gray-500">{c.medium}</td>
                    <td className="py-1.5 text-right text-gray-500">{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 레퍼럴 도메인 Top 10 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mt-5">
        <div className="text-xs font-medium text-gray-600 mb-3">레퍼럴 도메인 Top 10 (미분류 외부 유입)</div>
        {referrers.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400">분류되지 않은 외부 레퍼럴이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[300px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal">도메인</th>
                  <th className="text-right py-1.5 font-normal">PV</th>
                </tr>
              </thead>
              <tbody>
                {referrers.map((r, i) => (
                  <tr key={`${r.domain}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 text-gray-700">{r.domain}</td>
                    <td className="py-1.5 text-right text-gray-500">{r.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

      <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
        * 관리자/내부 경로(/dashboard, /content, /api-status, /traffic, /marketing 등)는 수집 대상에서 제외됩니다.<br />
        * 유료/자연 분류는 <code className="bg-gray-100 px-1 rounded">utm_medium</code>(cpc/paid/paid_social/display) 및 광고 클릭 ID(gclid, fbclid, msclkid, ttclid, yclid, n_media, kakaoad) 기준입니다.<br />
        * Meta/네이버 검색광고처럼 utm_medium을 자동으로 넣지 않는 플랫폼은 광고 URL에 직접 UTM을 부여하면 정확도가 올라갑니다.<br />
        * 서버 캐시 30초 · 소스 상세 카드는 페이지 로드 후 비동기 조회.
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

function BucketCard({ label, value, pctVal, color }: { label: string; value: number; pctVal: number; color: string }) {
  return (
    <div className={`rounded-lg px-2 py-2 ${color}`}>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
      <div className="text-base sm:text-lg font-semibold mt-0.5">{value.toLocaleString()}</div>
      <div className="text-[10px] opacity-70 mt-0.5">{pctVal}%</div>
    </div>
  )
}

function channelDotColor(c: Channel) {
  if (c.startsWith('paid_'))           return 'bg-red-500'
  if (c.startsWith('organic_search_')) return 'bg-amber-500'
  if (c.startsWith('social_organic_')) return 'bg-purple-500'
  if (c === 'direct')                  return 'bg-gray-400'
  if (c === 'email')                   return 'bg-indigo-500'
  if (c === 'referral')                return 'bg-blue-500'
  return 'bg-slate-400'
}

function channelBarColor(c: Channel) {
  if (c.startsWith('paid_'))           return 'bg-red-400'
  if (c.startsWith('organic_search_')) return 'bg-amber-400'
  if (c.startsWith('social_organic_')) return 'bg-purple-400'
  if (c === 'direct')                  return 'bg-gray-300'
  if (c === 'email')                   return 'bg-indigo-400'
  if (c === 'referral')                return 'bg-blue-400'
  return 'bg-slate-300'
}
