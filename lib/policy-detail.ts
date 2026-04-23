import { cache } from 'react';
import { prisma } from '@/lib/prisma';

/**
 * 정책 상세조회 — request-scope dedupe
 * ---------------------------------------------------------------
 * React 의 cache() 로 감싸서 동일 request 내에서
 *   - generateMetadata
 *   - default export (page render)
 * 가 같은 slug 를 조회할 때 DB hit 1회로 통합됩니다.
 *
 * 두 detail page (/welfare/[slug], /[category]/[slug]) 모두 이 함수를
 * import 해야 dedupe 가 작동합니다 (cache 는 동일 모듈 import 만 dedupe).
 */
export const getPolicyBySlug = cache(async (rawSlug: string) => {
  let decoded = rawSlug;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {
    // 잘못된 인코딩이면 원본 사용
  }

  try {
    return await prisma.policy.findFirst({
      where: { slug: decoded, status: 'PUBLISHED' },
      include: { category: true, faqs: true },
    });
  } catch (e) {
    console.error('[getPolicyBySlug] error:', e);
    return null;
  }
});

/**
 * 관련 정책 4건 (같은 카테고리, viewCount 내림차순)
 * 자주 호출되지 않으므로 cache 는 생략 — 한 페이지당 1회만 호출됨.
 */
export async function getRelatedPolicies(params: {
  categoryId: number | null | undefined;
  excludeId: number;
  take?: number;
}) {
  const { categoryId, excludeId, take = 4 } = params;
  if (!categoryId) return [];

  try {
    return await prisma.policy.findMany({
      where: {
        categoryId,
        id: { not: excludeId },
        status: 'PUBLISHED',
      },
      take,
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        geoRegion: true,
        excerpt: true,
        category: { select: { name: true, slug: true } },
      },
    });
  } catch (e) {
    console.error('[getRelatedPolicies] error:', e);
    return [];
  }
}
