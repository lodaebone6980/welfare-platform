// src/lib/trend-collector/news-rss-sources.ts
//
// 수집 대상 RSS 소스 레지스트리.
// 각 항목은 parser 가 처리할 수 있는 공통 스키마로 통일.

export type RssSource = {
  key: string;          // DB NewsItem.source 에 저장
  name: string;         // 사람이 읽는 이름
  agency: string;       // 추정 기관
  url: string;          // RSS URL
  tier: 'central' | 'portal' | 'local';
  enabled: boolean;
};

export const RSS_SOURCES: RssSource[] = [
  // === 중앙 부처 / 통합 ===
  {
    key: 'korea_kr',
    name: '대한민국 정책브리핑',
    agency: '문화체육관광부',
    url: 'https://www.korea.kr/rss/policyBriefing.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'moef',
    name: '기획재정부',
    agency: '기획재정부',
    url: 'https://www.moef.go.kr/nw/news/press/rssList.do',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'motie',
    name: '산업통상자원부',
    agency: '산업통상자원부',
    url: 'https://www.motie.go.kr/kor/article/rss/ATCL3030000000',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'mafra',
    name: '농림축산식품부',
    agency: '농림축산식품부',
    url: 'https://www.mafra.go.kr/mafra/rss/press.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'mof',
    name: '해양수산부',
    agency: '해양수산부',
    url: 'https://www.mof.go.kr/rss/press.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'molit',
    name: '국토교통부',
    agency: '국토교통부',
    url: 'https://www.molit.go.kr/rss/news.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'moel',
    name: '고용노동부',
    agency: '고용노동부',
    url: 'https://www.moel.go.kr/rss/news.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'mois',
    name: '행정안전부',
    agency: '행정안전부',
    url: 'https://www.mois.go.kr/rss/news.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'mohw',
    name: '보건복지부',
    agency: '보건복지부',
    url: 'https://www.mohw.go.kr/rss/news.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'moe',
    name: '교육부',
    agency: '교육부',
    url: 'https://www.moe.go.kr/rss/news.xml',
    tier: 'central',
    enabled: true,
  },
  {
    key: 'kosmes',
    name: '중소벤처기업부',
    agency: '중소벤처기업부',
    url: 'https://www.mss.go.kr/site/smba/rss/news.xml',
    tier: 'central',
    enabled: true,
  },

  // === 포털 ===
  {
    key: 'daum_politics',
    name: '다음 정치 뉴스',
    agency: '',
    url: 'https://media.daum.net/syndication/politics.rss',
    tier: 'portal',
    enabled: true,
  },
  {
    key: 'daum_economy',
    name: '다음 경제 뉴스',
    agency: '',
    url: 'https://media.daum.net/syndication/economic.rss',
    tier: 'portal',
    enabled: true,
  },
];

/**
 * 포함돼야 할 키워드 (OR) — 1개라도 있으면 수집
 */
export const INCLUDE_KEYWORDS = [
  '지원금',
  '보조금',
  '피해지원',
  '긴급지원',
  '환급',
  '바우처',
  '특별지원',
  '재난지원',
  '보상금',
  '수당',
  '장려금',
  '국가장학금',
  '내일배움',
  '디딤돌',
  '버팀목',
  '첫만남',
  '부모급여',
  '출산장려',
] as const;

/**
 * 배제할 키워드 (AND NOT) — 1개라도 있으면 제외
 */
export const EXCLUDE_KEYWORDS = [
  '주식',
  '가상자산',
  '코인',
  '임플란트',
  '정자은행',
  '도박',
  '성인',
  'AV',
  '이벤트 이자',
  '카지노',
] as const;

/**
 * 특정 키워드는 더 높은 우선순위로 점수 부여
 */
export const KEYWORD_WEIGHTS: Record<string, number> = {
  '긴급지원': 3.0,
  '피해지원': 3.0,
  '재난지원': 3.0,
  '특별지원': 2.5,
  '지원금':   1.5,
  '보조금':   1.5,
  '바우처':   1.2,
  '환급':     1.0,
};

/**
 * 제목+요약 문자열이 수집 대상인지 판정
 */
export function shouldCollect(text: string): boolean {
  const hay = text;
  const hasInclude = INCLUDE_KEYWORDS.some(k => hay.includes(k));
  if (!hasInclude) return false;
  const hasExclude = EXCLUDE_KEYWORDS.some(k => hay.includes(k));
  return !hasExclude;
}

/**
 * 가중 키워드 추출
 */
export function extractMatchedKeywords(text: string): string[] {
  return INCLUDE_KEYWORDS.filter(k => text.includes(k));
}

export function scoreKeywords(keywords: string[]): number {
  return keywords.reduce((sum, k) => sum + (KEYWORD_WEIGHTS[k] ?? 1.0), 0);
}
