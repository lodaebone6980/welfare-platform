/**
 * 유효한 카테고리 slug만 허용하기 위한 가드
 * ------------------------------------------------------------------
 * 파일 위치: app/(public)/[category]/[slug]/category_guard.ts
 * 또는 공용 유틸: lib/categories.ts
 */

export const ALL_CATEGORIES = [
  'refund',
  'voucher',
  'subsidy',
  'loan',
  'grant',
  'education',
  'housing',
  'medical',
  'employment',
  'culture',
  'pregnancy-childcare',
] as const;

export type CategorySlug = typeof ALL_CATEGORIES[number];

const CATEGORY_SET = new Set<string>(ALL_CATEGORIES);

export function isValidCategory(v: string | null | undefined): v is CategorySlug {
  return !!v && CATEGORY_SET.has(v);
}

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  refund: '환급금',
  voucher: '바우처',
  subsidy: '지원금',
  loan: '대출/금융',
  grant: '보조금',
  education: '교육/장학',
  housing: '주거',
  medical: '의료',
  employment: '취업/고용',
  culture: '문화/체육',
  'pregnancy-childcare': '임신·출산·육아',
};

export const CATEGORY_DESCRIPTIONS: Record<CategorySlug, string> = {
  refund: '납부한 세금·요금을 되돌려받는 제도 모음',
  voucher: '사용 목적이 지정된 이용권(상품권·이용료 감면)',
  subsidy: '현금으로 지급되는 중앙·지방정부 지원금',
  loan: '저금리 정책자금·보증·대환 대출',
  grant: '소득·자산 요건을 맞추면 받는 장려금·보조금',
  education: '학비·장학금·교육훈련비 지원',
  housing: '전·월세·주거안정·매입/임대 주택',
  medical: '의료비 본인부담 경감·재난적 의료비',
  employment: '구직·창업·훈련·취업장려',
  culture: '문화·예술·체육 활동 지원 바우처와 이용권',
  'pregnancy-childcare': '임신·출산·육아·아동수당 전 단계 지원',
};
