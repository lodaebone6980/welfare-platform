import Link from 'next/link'
import { buildPolicyQualityAudit, type PolicyAuditRow } from '@/lib/policy-quality-audit'

export const dynamic = 'force-dynamic'

type View = 'needs-work' | 'included' | 'all'

export default async function PolicyQualityPage({
  searchParams,
}: {
  searchParams?: { view?: string }
}) {
  const audit = await buildPolicyQualityAudit()
  const view: View = searchParams?.view === 'included'
    ? 'included'
    : searchParams?.view === 'all'
      ? 'all'
      : 'needs-work'

  const rows = audit.rows.filter((row) => {
    if (view === 'included') return row.sitemapIncluded
    if (view === 'needs-work') return !row.sitemapIncluded
    return true
  })
  const visibleRows = rows.slice(0, 200)

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">정책 품질 리포트</h1>
          <p className="mt-1 text-xs text-gray-500">
            sitemap 포함 여부와 애드센스 색인 품질 기준을 기준으로 공개 정책을 점검합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/policies/quality-report"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
          >
            JSON 전체 보기
          </a>
          <Link
            href="/content/policy"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            정책 목록
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="공개 정책" value={audit.summary.totalPublished} />
        <Kpi label="sitemap 포함" value={audit.summary.sitemapIncluded} tone="green" />
        <Kpi label="sitemap 제외" value={audit.summary.excluded} tone="amber" />
        <Kpi label="품질 통과" value={audit.summary.qualityPass} tone="blue" />
        <Kpi label="품질 미달" value={audit.summary.qualityFail} tone="red" />
        <Kpi label="canonical 중복" value={audit.summary.canonicalDerivative + audit.summary.duplicateFamily} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Issue label="본문 900자 미만" value={audit.summary.shortText} />
        <Issue label="출처 없음" value={audit.summary.missingSource} />
        <Issue label="지원대상 부족" value={audit.summary.missingEligibility} />
        <Issue label="신청방법 부족" value={audit.summary.missingApplicationMethod} />
        <Issue label="필요서류 부족" value={audit.summary.missingRequiredDocuments} />
        <Issue label="FAQ 부족" value={audit.summary.missingFaq} />
      </div>

      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
        <p className="font-semibold">색인 확대 판단</p>
        <p>
          지금은 {audit.summary.totalPublished.toLocaleString()}개 전체가 아니라 sitemap 포함 {audit.summary.sitemapIncluded.toLocaleString()}개를 우선 색인 후보로 쓰는 상태입니다.
          전체 색인은 가능하지만, 품질 미달·중복 문서가 함께 들어가면 애드센스 재심사에서 불리할 수 있습니다.
          아래 제외 목록을 보강한 뒤 포함 수를 단계적으로 늘리는 편이 안전합니다.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <Tab href="/content/policy/quality" active={view === 'needs-work'} label={`보강 필요 ${audit.summary.excluded.toLocaleString()}`} />
        <Tab href="/content/policy/quality?view=included" active={view === 'included'} label={`sitemap 포함 ${audit.summary.sitemapIncluded.toLocaleString()}`} />
        <Tab href="/content/policy/quality?view=all" active={view === 'all'} label={`전체 ${audit.summary.totalPublished.toLocaleString()}`} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-4 py-3 text-xs text-gray-500">
          {rows.length.toLocaleString()}개 중 상위 {visibleRows.length.toLocaleString()}개 표시
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-gray-50 text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left font-normal">상태</th>
                <th className="px-3 py-2 text-left font-normal">점수</th>
                <th className="px-3 py-2 text-left font-normal">정책</th>
                <th className="px-3 py-2 text-left font-normal">카테고리</th>
                <th className="px-3 py-2 text-right font-normal">본문</th>
                <th className="px-3 py-2 text-left font-normal">보강 필요</th>
                <th className="px-3 py-2 text-left font-normal">제외 사유</th>
                <th className="px-3 py-2 text-right font-normal">작업</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <ReportRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ReportRow({ row }: { row: PolicyAuditRow }) {
  return (
    <tr className="border-t border-gray-50 hover:bg-gray-50">
      <td className="px-3 py-3">
        <span className={[
          'rounded-full px-2 py-0.5 text-[10px] font-medium',
          row.sitemapIncluded ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
        ].join(' ')}>
          {row.sitemapIncluded ? '포함' : '제외'}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={[
          'inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold',
          row.grade === 'A' ? 'bg-green-100 text-green-700' :
          row.grade === 'B' ? 'bg-blue-100 text-blue-700' :
          row.grade === 'C' ? 'bg-amber-100 text-amber-700' :
          'bg-red-100 text-red-700',
        ].join(' ')}>
          {row.score}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="max-w-[300px] truncate font-medium text-gray-800">{row.title}</div>
        <div className="mt-0.5 max-w-[300px] truncate text-[10px] text-gray-400">{row.publicPath}</div>
      </td>
      <td className="px-3 py-3 text-gray-500">{row.categoryName ?? '-'}</td>
      <td className="px-3 py-3 text-right text-gray-500">{row.textLength.toLocaleString()}자</td>
      <td className="px-3 py-3">
        <div className="max-w-[220px] truncate text-gray-500">
          {row.missing.length ? row.missing.join(', ') : '-'}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="max-w-[220px] truncate text-gray-500">
          {row.reasons.length ? row.reasons.join(', ') : '-'}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="inline-flex gap-2">
          <Link href={`/content/policy/${row.id}/edit`} className="text-blue-600 hover:underline">
            수정
          </Link>
          <a href={row.publicPath} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline">
            보기
          </a>
        </div>
      </td>
    </tr>
  )
}

function Kpi({ label, value, tone = 'gray' }: { label: string; value: number; tone?: 'gray' | 'green' | 'amber' | 'blue' | 'red' }) {
  const color = {
    gray: 'text-gray-800',
    green: 'text-green-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    red: 'text-red-700',
  }[tone]
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value.toLocaleString()}</div>
    </div>
  )
}

function Issue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-700">{value.toLocaleString()}</div>
    </div>
  )
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={[
        'rounded-lg border px-3 py-1.5 transition-colors',
        active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
