import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

/**
 * 자주 쓰는 DB 쿼리들의 공용 캐싱 레이어.
 * - React `cache()`: 동일 요청 안에서의 중복 호출 dedupe (예: generateMetadata + page)
 * - `unstable_cache`: 요청 간 영속 캐시 (revalidate 단위 = 초)
 *
 * tags 를 활용하면 데이터 변경 시 `revalidateTag()` 로 즉시 무효화 가능.
 */

// ──────────────────────────────────────────────────────────────────
// Stats: 게시 정책 총 건수 (홈 hero 표기용 — 거의 변동 없음)
// ──────────────────────────────────────────────────────────────────
export const getCachedTotalPolicies = unstable_cache(
  async () => prisma.policy.count({ where: { status: 'PUBLISHED' } }),
  ['stats:total-published'],
  { revalidate: 1800, tags: ['policies'] }
);

// ──────────────────────────────────────────────────────────────────
// Categories with policy count — 홈 / 카테고리 / 검색 사이드바 공용
// 카테고리 자체는 변동이 매우 적음 → 30분 캐시
// ──────────────────────────────────────────────────────────────────
export const getCachedCategoriesWithCount = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        _count: { select: { policies: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ['categories:with-count'],
  { revalidate: 1800, tags: ['categories', 'policies'] }
);

// ──────────────────────────────────────────────────────────────────
// 검색 사이드바에서 쓰는 카테고리 목록 (정렬 다름)
// ──────────────────────────────────────────────────────────────────
export const getCachedCategoriesByPolicyCount = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: {
        name: true,
        slug: true,
        _count: { select: { policies: { where: { status: 'PUBLISHED' } } } },
      },
      orderBy: { policies: { _count: 'desc' } },
    }),
  ['categories:by-count'],
  { revalidate: 1800, tags: ['categories', 'policies'] }
);

// ──────────────────────────────────────────────────────────────────
// 홈에 노출되는 featured / latest / expiring 정책
// ──────────────────────────────────────────────────────────────────
export const getCachedFeaturedPolicies = unstable_cache(
  async () =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED', featured: true },
      orderBy: { featuredOrder: 'asc' },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        deadline: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
    }),
  ['policies:featured'],
  { revalidate: 600, tags: ['policies', 'policies:featured'] }
);

export const getCachedLatestPolicies = unstable_cache(
  async () =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        publishedAt: true,
        deadline: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
    }),
  ['policies:latest'],
  { revalidate: 600, tags: ['policies', 'policies:latest'] }
);

export const getCachedExpiringRaw = unstable_cache(
  async () =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED', deadline: { not: null } },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        deadline: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
      take: 30,
    }),
  ['policies:expiring-raw'],
  { revalidate: 600, tags: ['policies', 'policies:expiring'] }
);

// ──────────────────────────────────────────────────────────────────
// Policy 단건 조회 (slug) — generateMetadata 와 page.default 가
// 같은 호출을 두 번 하지 않도록 React.cache 로 요청-스코프 dedupe.
// ──────────────────────────────────────────────────────────────────
export const getPolicyBySlug = cache(async (slug: string) => {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {}
  return prisma.policy.findFirst({
    where: { slug: decoded, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      description: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      deadline: true,
      categoryId: true,
      geoRegion: true,
      applyUrl: true,
      viewCount: true,
      publishedAt: true,
      category: { select: { id: true, name: true, slug: true, icon: true } },
      faqs: {
        select: { id: true, question: true, answer: true, order: true },
        orderBy: { order: 'asc' },
      },
    },
  });
});

// ──────────────────────────────────────────────────────────────────
// 정적 사전생성에 쓸 인기 슬러그 N개 (revalidate 시 새로고침)
// ──────────────────────────────────────────────────────────────────
export const getCachedTopPolicySlugs = unstable_cache(
  async (limit = 200) =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: { slug: true },
    }),
  ['policies:top-slugs'],
  { revalidate: 3600, tags: ['policies'] }
);
