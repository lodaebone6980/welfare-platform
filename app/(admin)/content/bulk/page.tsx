import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { KR_REGIONS } from '@/lib/regions'
import BulkClient from './BulkClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getBasePolicies() {
  try {
    return await prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 50,
      select: { id: true, slug: true, title: true, geoRegion: true },
    })
  } catch {
    return []
  }
}

export default async function BulkPage() {
  const policies = await getBasePolicies()

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-medium text-gray-800">GEO 대량 생성</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">
            대표 정책 1건을 17개 광역시·도별 랜딩으로 복제합니다. (MVP 스텁)
          </p>
        </div>
        <Link
          href="/welfare/region/seoul"
          target="_blank"
          className="text-[11px] text-blue-600 hover:underline"
        >
          /welfare/region/seoul 미리보기 ↗
        </Link>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">대상 지역 ({KR_REGIONS.length})</h2>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {KR_REGIONS.map((r) => (
            <span key={r.slug} className="rounded border border-gray-200 px-2 py-1 text-gray-600">
              {r.name} <span className="text-gray-400">/{r.slug}</span>
            </span>
          ))}
        </div>
      </div>

      <BulkClient policies={policies} regions={KR_REGIONS} />

      <div className="mt-8 rounded-lg border border-amber-100 bg-amber-50 p-4 text-[12px] text-amber-800">
        <p className="font-medium mb-1">⚠️ 현재 MVP 스텁 단계</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>실제 DB 복제는 아직 연결되어 있지 않습니다. 다음 PR에서 <code>/api/admin/bulk-region</code> 라우트를 붙입니다.</li>
          <li>SEO 리스크 방지를 위해 복제본은 canonical 을 원본에 걸고 지역 문구만 치환합니다.</li>
          <li>복제 전 반드시 원본 정책의 <code>geoRegion</code> 이 전국 또는 null 인지 확인하세요.</li>
        </ul>
      </div>
    </div>
  )
}
