import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { SITE_URL, SITE_NAME } from '@/lib/env'
import {
  KR_REGIONS,
  REGION_BY_SLUG,
  regionAliasContainsFilter,
} from '@/lib/regions'
import { generateRegionLandingJsonLd } from '@/lib/seo-extras'
import { policyHref } from '@/lib/categories'

export const dynamic = 'force-static'
export const revalidate = 60 * 60 // 1h ISR

interface PageProps {
  params: { region: string }
}

export function generateStaticParams() {
  return KR_REGIONS.map((r) => ({ region: r.slug }))
}

export function generateMetadata({ params }: PageProps): Metadata {
  const region = REGION_BY_SLUG[params.region]
  if (!region) return { title: SITE_NAME }
  const title = `${region.name} 정부지원금·복지 혜택 모음 2026 | ${SITE_NAME}`
  const description = `${region.name} 거주자가 받을 수 있는 2026년 정부지원금·보조금·환급금·바우처 정책을 모았습니다. 나에게 맞는 혜택을 바로 찾아보세요.`
  const url = `${SITE_URL}/welfare/region/${region.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: 'ko_KR', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    other: {
      'geo.region': region.iso,
      'geo.placename': region.name,
    },
  }
}

type Row = {
  id: number
  slug: string
  title: string
  excerpt: string | null
  categoryName: string | null
  categorySlug: string | null
  updatedAt: Date
}

async function getPolicies(regionSlug: string): Promise<Row[]> {
  const region = REGION_BY_SLUG[regionSlug]
  if (!region) return []
  try {
    const rows = await prisma.policy.findMany({
      where: {
        status: 'PUBLISHED',
        ...regionAliasContainsFilter(region),
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: 60,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      categoryName: r.category?.name ?? null,
      categorySlug: r.category?.slug ?? null,
      updatedAt: r.updatedAt,
    }))
  } catch {
    return []
  }
}

export default async function RegionLanding({ params }: PageProps) {
  const region = REGION_BY_SLUG[params.region]
  if (!region) notFound()

  const items = await getPolicies(params.region)
  const jsonLd = generateRegionLandingJsonLd({
    regionName: region.name,
    regionSlug: region.slug,
    items: items.map((i) => ({ title: i.title, slug: i.slug })),
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-xs text-gray-500 mb-3">
        <Link href="/" className="hover:underline">홈</Link>
        <span className="mx-1">/</span>
        <Link href="/welfare/search" className="hover:underline">정책검색</Link>
        <span className="mx-1">/</span>
        <span>{region.name}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
          {region.name} 정부지원금·복지 혜택
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {region.short} 거주자가 받을 수 있는 2026년 생계·주거·교육·일자리·창업 지원 정책을 한눈에 모았습니다.
          신청 대상과 방법을 꼭 확인하세요.
        </p>
      </header>

      <section className="mb-8">
        <div className="flex flex-wrap gap-2 text-xs">
          {KR_REGIONS.map((r) => (
            <Link
              key={r.slug}
              href={`/welfare/region/${r.slug}`}
              className={
                'rounded-full border px-3 py-1 ' +
                (r.slug === region.slug
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50')
              }
            >
              {r.short}
            </Link>
          ))}
        </div>
      </section>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
          아직 이 지역으로 분류된 공개 정책이 없습니다. 전국 대상 정책을 먼저 확인해보세요.
          <div className="mt-3">
            <Link href="/welfare/search" className="text-blue-600 hover:underline">
              전국 정책 검색하기 →
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
          {items.map((p) => (
            <li key={p.id} className="p-4 hover:bg-gray-50">
              <Link href={policyHref({ categorySlug: p.categorySlug, slug: p.slug })} className="block">
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  {p.categoryName && <span className="rounded bg-gray-100 px-2 py-0.5">{p.categoryName}</span>}
                  <span>{p.updatedAt.toISOString().slice(0, 10)}</span>
                </div>
                <h2 className="mt-1 text-base font-medium text-gray-900">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.excerpt}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-8 text-[11px] text-gray-400">
        ※ 본 페이지는 공공데이터·공식 발표 자료를 기반으로 재구성되었습니다.
        최종 신청은 반드시 각 기관 공식 안내를 확인하세요.
      </footer>
    </div>
  )
}
