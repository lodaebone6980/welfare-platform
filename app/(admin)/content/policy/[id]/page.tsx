import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PolicyDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()

  const policy = await prisma.policy.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  })
  if (!policy) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1000px] mx-auto w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{policy.title}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {policy.status} · {policy.category?.name ?? '카테고리 없음'} · /welfare/{policy.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/content/policy" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            목록
          </Link>
          <Link href={`/content/policy/${policy.id}/edit`} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700">
            수정
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-gray-100 bg-white p-5">
        {policy.excerpt && <p className="mb-5 text-sm leading-6 text-gray-600">{policy.excerpt}</p>}
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <Info label="지역" value={[policy.geoRegion, policy.geoDistrict].filter(Boolean).join(' ') || '-'} />
          <Info label="마감일" value={policy.deadline || '-'} />
          <Info label="신청 URL" value={policy.applyUrl || '-'} />
          <Info label="출처 URL" value={policy.externalUrl || '-'} />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-gray-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">본문</h2>
        <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{policy.content}</div>
      </section>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 break-all text-gray-700">{value}</div>
    </div>
  )
}
