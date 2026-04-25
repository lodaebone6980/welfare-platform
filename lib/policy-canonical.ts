// lib/policy-canonical.ts
// 파생본 → 대표원본 rel=canonical 경로 계산 헬퍼
// ------------------------------------------------------------------
// 목적
//   중복 SEO 페널티를 피하기 위해, canonicalId 가 세팅된 파생본은
//   대표원본(canonical 원본) 의 URL 을 <link rel="canonical"> 로 가리킨다.
//
// 안전장치
//   1) canonicalId 가 null → 본인이 canonical → 자기 URL
//   2) canonicalId === 자기 id → 자기 URL
//   3) canonical 원본이 PUBLISHED 가 아니거나 없음 → 자기 URL 로 fallback
//   4) 원본 카테고리 slug 가 화이트리스트에 없으면 /welfare/[slug] 로 fallback

import { prisma } from '@/lib/prisma';
import { isValidCategorySlug } from '@/lib/categories';

export interface PolicyLike {
  id: number;
  slug: string;
  canonicalId?: number | null;
  category?: { slug?: string | null } | null;
}

/** 경로만 리턴. SITE_URL prefix 는 호출부에서 붙인다. */
export async function getCanonicalPath(policy: PolicyLike): Promise<string> {
  // 본인 canonical 또는 매핑 없음
  if (!policy.canonicalId || policy.canonicalId === policy.id) {
    return buildPath(policy.category?.slug ?? null, policy.slug);
  }

  try {
    const orig = await prisma.policy.findUnique({
      where: { id: policy.canonicalId },
      select: {
        slug: true,
        status: true,
        category: { select: { slug: true } },
      },
    });

    if (!orig || orig.status !== 'PUBLISHED') {
      return buildPath(policy.category?.slug ?? null, policy.slug);
    }

    return buildPath(orig.category?.slug ?? null, orig.slug);
  } catch {
    return buildPath(policy.category?.slug ?? null, policy.slug);
  }
}

function buildPath(categorySlug: string | null, policySlug: string): string {
  if (categorySlug && isValidCategorySlug(categorySlug)) {
    return `/${categorySlug}/${encodeURIComponent(policySlug)}`;
  }
  return `/welfare/${encodeURIComponent(policySlug)}`;
}

/** 파생본 여부 — 추후 경량 템플릿 분기용 */
export function isDerivative(policy: PolicyLike): boolean {
  return !!policy.canonicalId && policy.canonicalId !== policy.id;
}