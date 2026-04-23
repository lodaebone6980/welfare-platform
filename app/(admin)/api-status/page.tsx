import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'

// 어드민만 접근 → 2분 캐시 허용 (API 상태는 cron 이후에만 갱신되므로 실시간 불필요)
export const dynamic = 'force-dynamic'
export const revalidate = 120

type ApiSourceRow = {
  id: number
  name: string
  url: string
  type: string
  status: string
  lastSuccess: Date | null
  lastError: Date | null
  todayCount: number
  totalCount: number
  createdAt: Date
  updatedAt: Date
}

const getApiSources = unstable_cache(
  async (): Promise<ApiSourceRow[]> => {
    try {
      return (await prisma.apiSource.findMany({
        orderBy: [{ status: 'asc' }, { name: 'asc' }],
      })) as ApiSourceRow[]
    } catch {
      return []
    }
  },
  ['api-sources-v1'],
  { revalidate: 120, tags: ['api-status'] },
)

/** 기본 공공데이터 API 카탈로그 (DB에 아직 등록 전일 때 안내용) */
const DEFAULT_CATALOG = [
  { name: '복지로 정책 API',            host: 'apis.data.go.kr/B554287',                        note: '정부 복지 서비스 통합 목록/상세' },
  { name: '정부24 민원/정책 API',       host: 'apis.data.go.kr/1741000',                        note: '생애주기·대상별 서비스 안내' },
  { name: '청년정책 통합 API (온통청년)', host: 'www.youthcenter.go.kr/opi/youthPlcyList.do',     note: '청년정책 DB' },
  { name: '소상공인24/중기부',          host: 'apis.data.go.kr/B552735',                        note: '소상공인 지원사업' },
  { name: '주택도시보증공사 청약 정보',  host: 'apis.data.go.kr/B552555',                        note: '주거 지원' },
  { name: '교육부 장학금/학자금 API',   host: 'apis.data.go.kr/B551014',                        note: '교육 지원' },
  { name: '통계청 KOSIS',              host: 'kosis.kr/openapi',                               note: '통계 지표 보조' },
  { name: '고용노동부 고용24',          host: 'apis.data.go.kr/1490000',                        note: '구직·직업훈련' },
]

function StatusBadge({ status }: { status: string }) {
  const style =
    status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'warn'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-600 border-red-200'
  const label = status === 'active' ? '정상' : status === 'warn' ? '경고' : '오류'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}

function fmt(d: Date | null | undefined) {
  if (!d) return '-'
  const dt = new Date(d)
  const now = Date.now()
  const diff = now - dt.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const day = Math.floor(h / 24)
  return `${day}일 전`
}

async function SummaryCards() {
  const sources = await getApiSources()
  const activeCount = sources.filter(s => s.status === 'active').length
  const warnCount = sources.filter(s => s.status === 'warn').length
  const errorCount = sources.filter(s => s.status !== 'active' && s.status !== 'warn').length
  const todayTotal = sources.reduce((a, b) => a + (b.todayCount ?? 0), 0)
  const allTotal = sources.reduce((a, b) => a + (b.totalCount ?? 0), 0)
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Summary label="정상 API" value={activeCount} accent="text-green-600" />
        <Summary label="경고"     value={warnCount}   accent="text-amber-600" />
        <Summary label="오류"     value={errorCount}  accent="text-red-500" />
        <Summary label="오늘 수집" value={todayTotal} accent="text-gray-700" suffix="건" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <Summary label="누적 수집" value={allTotal}  accent="text-gray-700" suffix="건" />
        <Summary label="등록 소스" value={sources.length} accent="text-gray-700" />
      </div>
    </>
  )
}

function SummaryCardsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 animate-pulse">
            <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
            <div className="h-6 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </>
  )
}

async function SourcesTable() {
  const sources = await getApiSources()
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5">
      <div className="text-xs font-medium text-gray-600 mb-3">등록된 API 소스</div>
      {sources.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-400">
          등록된 API 소스가 아직 없습니다. 먼저 <code className="bg-gray-100 px-1 rounded">ApiSource</code> 테이블에 소스를 추가하세요.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-normal">이름</th>
                <th className="text-left py-1.5 font-normal hidden sm:table-cell">URL</th>
                <th className="text-left py-1.5 font-normal">상태</th>
                <th className="text-right py-1.5 font-normal">오늘</th>
                <th className="text-right py-1.5 font-normal">누적</th>
                <th className="text-right py-1.5 font-normal">최근 성공</th>
                <th className="text-right py-1.5 font-normal hidden sm:table-cell">최근 오류</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s: ApiSourceRow) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-700 truncate max-w-[200px]">{s.name}</td>
                  <td className="py-2 text-gray-400 truncate max-w-[240px] hidden sm:table-cell">{s.url}</td>
                  <td className="py-2"><StatusBadge status={s.status} /></td>
                  <td className="py-2 text-right text-gray-500">{s.todayCount.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500">{s.totalCount.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-500">{fmt(s.lastSuccess)}</td>
                  <td className="py-2 text-right text-red-500 hidden sm:table-cell">{fmt(s.lastError)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SourcesTableSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-50 rounded" />
        ))}
      </div>
    </div>
  )
}

export default function ApiStatusPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">API 수집 현황</h1>
        <span className="text-[10px] text-gray-400">공공데이터포털 + 제휴 API 모니터링 · 2분 캐시</span>
      </div>

      {/* 요약 카드 + 상세 테이블을 같은 DB 쿼리 재사용 (unstable_cache 덕분) */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards />
      </Suspense>

      <Suspense fallback={<SourcesTableSkeleton />}>
        <SourcesTable />
      </Suspense>

      {/* 권장 카탈로그 — 정적, 즉시 렌더 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-600">권장 공공데이터 카탈로그</div>
          <span className="text-[10px] text-gray-400">등록 후 수집 시작</span>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[420px]">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1.5 font-normal">소스명</th>
                <th className="text-left py-1.5 font-normal">호스트</th>
                <th className="text-left py-1.5 font-normal hidden sm:table-cell">비고</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_CATALOG.map(c => (
                <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-700">{c.name}</td>
                  <td className="py-2 text-gray-400 truncate max-w-[260px]">{c.host}</td>
                  <td className="py-2 text-gray-500 hidden sm:table-cell">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Summary({
  label,
  value,
  accent,
  suffix,
}: {
  label: string
  value: number
  accent?: string
  suffix?: string
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg sm:text-xl font-medium ${accent ?? 'text-gray-800'}`}>
        {value.toLocaleString()}
        {suffix ? <span className="text-xs text-gray-400 ml-0.5">{suffix}</span> : null}
      </div>
    </div>
  )
}
