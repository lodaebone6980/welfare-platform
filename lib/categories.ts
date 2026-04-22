/**
 * 카테고리 화이트리스트 & 라우팅 헬퍼
 * ------------------------------------------------------------------
 * 파일 위치: lib/categories.ts
 *
 * 용도:
 *   - /:category/:slug URL 리팩터링 시 category 파라미터를 서버에서 검증
 *   - 오타/악성 URL 탐지 → 404 처리
 *   - 카테고리 표시명(중간점 제거), 링크 생성
 *
 * 카테고리 목록은 DB Category.slug와 일치시켜야 하며, 신규 카테고리 추가 시
 * 이 파일도 반드시 업데이트해야 한다.
 */

export const CATEGORY_SLUGS = [
  'living-stability',  // 생활안정
  'housing',           // 주거·자립
  'education',         // 보육·교육
  'employment',        // 고용·창업
  'health',            // 건강·의료
  'administration',    // 행정·안전
  'pregnancy',         // 임신·출산
  'care',              // 보호·돌봄
  'culture',           // 문화·환경
  'agriculture',       // 농림·축산·어업
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_SLUG_TO_NAME: Record<CategorySlug, string> = {
  'living-stability': '생활안정',
  'housing':          '주거·자립',
  'education':        '보육·교육',
  'employment':       '고용·창업',
  'health':           '건강·의료',
  'administration':   '행정·안전',
  'pregnancy':        '임신·출산',
  'care':             '보호·돌봄',
  'culture':          '문화·환경',
  'agriculture':      '농림·축산·어업',
};

/** /:category/:slug 를 라우팅하기 전에 호출 — false면 404 */
export function isValidCategorySlug(slug: string | null | undefined): slug is CategorySlug {
  if (!slug) return false;
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

/** 카테고리 표시명 (중간점 제거) */
export function categoryDisplayName(slug: string | null | undefined): string {
  if (!isValidCategorySlug(slug)) return '';
  return CATEGORY_SLUG_TO_NAME[slug].replace(/·/g, ' ');
}

/** 정책 상세 URL 생성 - 현재는 /welfare/:slug 유지, 리팩터링 후 /:category/:slug */
export function policyHref(opts: { categorySlug?: string | null; slug: string }): string {
  const { categorySlug, slug } = opts;
  if (categorySlug && isValidCategorySlug(categorySlug)) {
    return `/${categorySlug}/${encodeURIComponent(slug)}`;
  }
  // fallback — 기존 URL
  return `/welfare/${encodeURIComponent(slug)}`;
}

/** 카테고리 인덱스 URL */
export function categoryIndexHref(slug: string): string {
  return `/welfare/categories/${slug}`;
}
