// lib/category-mapper.ts
// data.go.kr 복지서비스 카테고리 매핑

export const WELFARE_CATEGORIES = [
  { name: '생활안정', slug: 'living-stability', icon: '🏠', displayOrder: 1 },
  { name: '주거·자립', slug: 'housing', icon: '🏗️', displayOrder: 2 },
  { name: '보육·교육', slug: 'education', icon: '📚', displayOrder: 3 },
  { name: '고용·창업', slug: 'employment', icon: '💼', displayOrder: 4 },
  { name: '건강·의료', slug: 'health', icon: '🏥', displayOrder: 5 },
  { name: '행정·안전', slug: 'administration', icon: '🏛️', displayOrder: 6 },
  { name: '임신·출산', slug: 'pregnancy', icon: '👶', displayOrder: 7 },
  { name: '보호·돌봄', slug: 'care', icon: '🤝', displayOrder: 8 },
  { name: '문화·환경', slug: 'culture', icon: '🎭', displayOrder: 9 },
  { name: '농림·축산·어업', slug: 'agriculture', icon: '🌾', displayOrder: 10 },
] as const;

export type CategorySlug = typeof WELFARE_CATEGORIES[number]['slug'];

// data.go.kr API 카테고리 코드 매핑
const CODE_TO_CATEGORY: Record<string, string> = {
  '070': '생활안정',
  '080': '주거·자립',
  '020': '보육·교육',
  '010': '고용·창업',
  '030': '건강·의료',
  '110': '행정·안전',
  '040': '임신·출산',
  '050': '보호·돌봄',
  '090': '문화·환경',
  '100': '농림·축산·어업',
};

export function mapCategoryCode(code: string): string {
  return CODE_TO_CATEGORY[code] || '생활안정';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generatePolicySlug(title: string, id?: string): string {
  const base = slugify(title).substring(0, 60);
  return id ? `${base}-${id}` : base;
}

// 지역 코드 매핑
export const REGION_MAP: Record<string, string> = {
  '6110000': '서울',
  '6260000': '부산',
  '6270000': '대구',
  '6280000': '인천',
  '6290000': '광주',
  '6300000': '대전',
  '6310000': '울산',
  '6410000': '경기',
  '6420000': '강원',
  '6430000': '충북',
  '6440000': '충남',
  '6450000': '전북',
  '6460000': '전남',
  '6470000': '경북',
  '6480000': '경남',
  '6500000': '제주',
  '6360000': '세종',
};

export function mapRegionCode(code: string): string | null {
  return REGION_MAP[code] || null;
}
