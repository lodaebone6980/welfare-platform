import { prisma } from '@/lib/prisma'
import PolicyListClient from './PolicyListClient'

/**
 * 정책 관리 — 첫 20건 + 전체 count 를 서버에서 prefetch.
 * 기존 CSR 의 "불러오는 중..." 스피너를 제거하고 즉시 테이블 렌더.
 * 상태/검색 필터는 클라이언트에서 기존 API 로 refetch.
 */
// force-dynamic 제거: Link prefetch 활성화
export const revalidate = 30

const PAGE_SIZE = 20

const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  status: true,
  geoRegion: true,
  geoDistrict: true,
  thumbnail: true,
  viewCount: true,
  featured: true,
  featuredOrder: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  focusKeyword: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
} as const

async function getInitialPolicies() {
  try {
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        select: listSelect,
      }),
      prisma.policy.count(),
    ])
    return { policies, total }
  } catch {
    return { policies: [], total: 0 }
  }
}

export default async function PolicyListPage() {
  const { policies, total } = await getInitialPolicies()
  return <PolicyListClient initialPolicies={policies} initialTotal={total} />
}
