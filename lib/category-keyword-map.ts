// lib/category-keyword-map.ts
// 공공데이터 코드가 없을 때 사용하는 키워드 기반 카테고리·지역 보조 매핑.
// WELFARE_CATEGORIES 의 slug 와 1:1 로 매칭되며, 수집 파이프라인에서
// mapCategoryCode 가 unknown 일 때 fallback 으로 호출합니다.

import type { CategorySlug } from './category-mapper';

/** 키워드 → 카테고리 slug. 상위에 가까울수록 우선순위 높음. */
export const KEYWORD_TO_CATEGORY: Array<[CategorySlug, string[]]> = [
  ['pregnancy',        ['임신', '출산', '난임', '분만', '아이돌봄', '산후']],
  ['education',        ['보육', '교육', '학자금', '장학', '어린이집', '방과후', '유치원', '등록금']],
  ['employment',       ['고용', '취업', '창업', '구직', '실업', '근로장려', '사업주', '청년도약']],
  ['health',           ['건강', '의료', '치료', '병원', '질환', '예방접종', '건강검진', '희귀']],
  ['housing',          ['주거', '전세', '월세', '임대', '매입임대', '공공주택', '청약', '리모델링']],
  ['care',             ['돌봄', '요양', '장애', '노인', '보호', '한부모', '아동', '다문화']],
  ['culture',          ['문화', '예술', '체육', '스포츠', '관광', '여가', '환경', '에너지']],
  ['agriculture',      ['농림', '축산', '어업', '농업', '농촌', '수산', '영농', '어촌']],
  ['administration',   ['행정', '안전', '재난', '방역', '화재', '경찰', '민방위']],
  ['living-stability', ['생계', '기초수급', '긴급복지', '생활안정', '바우처', '저소득']],
];

export function inferCategoryFromText(title: string, body?: string): CategorySlug {
  const text = ' ' + (title || '') + ' ' + (body || '') + ' ';
  for (const [slug, kws] of KEYWORD_TO_CATEGORY) {
    for (const k of kws) if (text.includes(k)) return slug;
  }
  return 'living-stability';
}

/** 시·도/주요 시군구 자연어 → region code 축약 매핑 */
export const NAME_TO_REGION: Record<string, string> = {
  '서울특별시': '서울', '서울': '서울',
  '부산광역시': '부산', '부산': '부산',
  '대구광역시': '대구', '대구': '대구',
  '인천광역시': '인천', '인천': '인천',
  '광주광역시': '광주', '광주': '광주',
  '대전광역시': '대전', '대전': '대전',
  '울산광역시': '울산', '울산': '울산',
  '세종특별자치시': '세종', '세종': '세종',
  '경기도': '경기', '경기': '경기',
  '수원시': '경기', '성남시': '경기', '용인시': '경기', '고양시': '경기',
  '강원도': '강원', '강원특별자치도': '강원', '강원': '강원',
  '충청북도': '충북', '충북': '충북', '청주시': '충북',
  '충청남도': '충남', '충남': '충남', '천안시': '충남',
  '전라북도': '전북', '전북특별자치도': '전북', '전북': '전북', '전주시': '전북',
  '전라남도': '전남', '전남': '전남', '여수시': '전남',
  '경상북도': '경북', '경북': '경북', '포항시': '경북',
  '경상남도': '경남', '경남': '경남', '창원시': '경남',
  '제주특별자치도': '제주', '제주도': '제주', '제주': '제주',
};

export function inferRegionFromText(title: string, body?: string): string | null {
  const text = ' ' + (title || '') + ' ' + (body || '') + ' ';
  for (const [name, region] of Object.entries(NAME_TO_REGION)) {
    if (text.includes(name)) return region;
  }
  return null;
}

/** 수집 파이프라인 통합 헬퍼: code 우선, 키워드 fallback */
export interface InferResult {
  category: CategorySlug;
  region: string | null;
  source: {
    category: 'code' | 'keyword' | 'fallback';
    region: 'code' | 'keyword' | 'none';
  };
}

export function resolveCategoryAndRegion(opts: {
  title: string;
  body?: string;
  categoryCode?: string | null;
  regionCode?: string | null;
  mapCategoryCode: (code: string) => string | null | undefined;
  mapRegionCode: (code: string) => string | null | undefined;
  WELFARE_CATEGORIES: ReadonlyArray<{ name: string; slug: CategorySlug }>;
}): InferResult {
  const { title, body, categoryCode, regionCode, mapCategoryCode, mapRegionCode, WELFARE_CATEGORIES } = opts;

  // 1) 카테고리: code -> keyword -> fallback
  let categorySlug: CategorySlug = 'living-stability';
  let categorySource: InferResult['source']['category'] = 'fallback';
  if (categoryCode) {
    const name = mapCategoryCode(categoryCode);
    const found = WELFARE_CATEGORIES.find((c) => c.name === name);
    if (found) { categorySlug = found.slug; categorySource = 'code'; }
  }
  if (categorySource === 'fallback') {
    const inferred = inferCategoryFromText(title, body);
    categorySlug = inferred;
    categorySource = inferred === 'living-stability' ? 'fallback' : 'keyword';
  }

  // 2) 지역: code -> keyword -> none
  let region: string | null = null;
  let regionSource: InferResult['source']['region'] = 'none';
  if (regionCode) {
    const mapped = mapRegionCode(regionCode);
    if (mapped) { region = mapped; regionSource = 'code'; }
  }
  if (!region) {
    const inferred = inferRegionFromText(title, body);
    if (inferred) { region = inferred; regionSource = 'keyword'; }
  }

  return { category: categorySlug, region, source: { category: categorySource, region: regionSource } };
}
