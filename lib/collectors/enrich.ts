/**
 * lib/collectors/enrich.ts
 * ---------------------------------------------------------------
 * 수집기(crawler)가 외부 원천에서 긁어온 정책 draft 를 DB 저장 직전에
 * 카테고리 / 지역으로 자동 매칭해 주는 enrich 단계.
 *
 * - resolveCategoryAndRegion() 에서 얻은 categorySlug → categoryId 로 resolve
 *   (Category 테이블에 존재하는 경우에만; 없으면 undefined)
 * - geoRegion(광역)은 그대로 반영
 * - 이미 수집기 쪽에서 명시적으로 지정한 값이 있다면 preserve (override 금지)
 * - Category 조회는 모듈 전역 캐시로 1회만 수행
 * ---------------------------------------------------------------
 */

import { prisma } from '@/lib/prisma';
import { resolveCategoryAndRegion } from '@/lib/category-keyword-map';

export type EnrichInput = {
  title?: string | null;
  description?: string | null;
  excerpt?: string | null;
  eligibility?: string | null;
  focusKeyword?: string | null;
  /** 이미 설정되어 있으면 덮어쓰지 않음 */
  categoryId?: number | null;
  geoRegion?: string | null;
};

export type EnrichOutput = {
  categoryId?: number;
  categorySlug?: string;
  geoRegion?: string;
  matchedBy: 'existing' | 'resolver' | 'none';
};

// slug → id 캐시 (프로세스 생존 동안 유효)
let categoryCache: Map<string, number> | null = null;

async function getCategoryCache(): Promise<Map<string, number>> {
  if (categoryCache) return categoryCache;
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.slug, r.id);
  categoryCache = m;
  return m;
}

function textOf(input: EnrichInput): string {
  return [
    input.title || '',
    input.focusKeyword || '',
    input.excerpt || '',
    input.description || '',
    input.eligibility || '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 한 건의 draft 를 enrich.
 * - 기존에 categoryId / geoRegion 이 박혀 있으면 그대로 반환
 * - 아니면 resolveCategoryAndRegion 호출 후 카테고리 id 매핑
 */
export async function enrichPolicyInput(
  input: EnrichInput,
): Promise<EnrichOutput> {
  // 이미 수집기 쪽에서 매칭된 값이 있으면 그대로
  if (input.categoryId && input.geoRegion) {
    return {
      categoryId: input.categoryId,
      geoRegion: input.geoRegion,
      matchedBy: 'existing',
    };
  }

  const text = textOf(input);
  if (!text) return { matchedBy: 'none' };

  // resolveCategoryAndRegion 는 sync 로 {categorySlug?, regionCode?} 반환
  const resolved = resolveCategoryAndRegion(text) as {
    categorySlug?: string;
    regionCode?: string;
  };

  const out: EnrichOutput = { matchedBy: 'resolver' };

  if (resolved.categorySlug) {
    out.categorySlug = resolved.categorySlug;
    if (!input.categoryId) {
      const cache = await getCategoryCache();
      const id = cache.get(resolved.categorySlug);
      if (typeof id === 'number') out.categoryId = id;
    } else {
      out.categoryId = input.categoryId;
    }
  } else if (input.categoryId) {
    out.categoryId = input.categoryId;
  }

  if (!input.geoRegion && resolved.regionCode) {
    out.geoRegion = resolved.regionCode;
  } else if (input.geoRegion) {
    out.geoRegion = input.geoRegion;
  }

  if (out.categoryId === undefined && out.geoRegion === undefined) {
    out.matchedBy = 'none';
  }
  return out;
}

/**
 * enrich 결과를 Prisma Policy 입력 payload 에 머지해 반환.
 * - 유일한 정답은 undefined 제거이며, 원본 payload 의 다른 필드는 건드리지 않음.
 */
export function mergeEnrich<T extends Record<string, unknown>>(
  payload: T,
  enrich: EnrichOutput,
): T {
  const next: Record<string, unknown> = { ...payload };
  if (enrich.categoryId !== undefined) next.categoryId = enrich.categoryId;
  if (enrich.geoRegion !== undefined) next.geoRegion = enrich.geoRegion;
  return next as T;
}

/** 테스트용 - 캐시 리셋 */
export function __resetEnrichCache() {
  categoryCache = null;
}
