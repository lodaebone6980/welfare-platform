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
// 카테고리 단건 조회 (slug) — category/[slug] 페이지 공용
// ──────────────────────────────────────────────────────────────────
export const getCachedCategoryBySlug = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, icon: true },
    }),
  ['category:by-slug'],
  { revalidate: 1800, tags: ['categories'] }
);

// ──────────────────────────────────────────────────────────────────
// 카테고리별 정책 리스트 (pagination + sort) — 인자별 자동 키잉
// ──────────────────────────────────────────────────────────────────
export const getCachedCategoryPolicies = unstable_cache(
  async (
    categoryId: string,
    page: number,
    sortBy: 'latest' | 'popular',
    take: number
  ) =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED', categoryId },
      orderBy:
        sortBy === 'popular'
          ? { viewCount: 'desc' }
          : { publishedAt: 'desc' },
      skip: (page - 1) * take,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        deadline: true,
        publishedAt: true,
      },
    }),
  ['category:policies'],
  { revalidate: 600, tags: ['policies'] }
);

export const getCachedCategoryPolicyCount = unstable_cache(
  async (categoryId: string) =>
    prisma.policy.count({ where: { status: 'PUBLISHED', categoryId } }),
  ['category:policy-count'],
  { revalidate: 600, tags: ['policies'] }
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
// 검색 기본 뷰 (필터 없음, page=1, sort=latest) — 초기 진입 캐싱
// ──────────────────────────────────────────────────────────────────
export const getCachedSearchDefault = unstable_cache(
  async (take: number) =>
    prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      skip: 0,
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        viewCount: true,
        deadline: true,
        publishedAt: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
    }),
  ['search:default-latest'],
  { revalidate: 600, tags: ['policies'] }
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
