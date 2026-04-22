/**
 * lib/collectors/naver-news.ts
 * ------------------------------------------------------------------
 * Naver 검색 API (뉴스) 연동 — 최근 이슈 기반 지원금 후보 수집기.
 *
 * 유스케이스:
 *   "유가 피해지원금", "수해 피해지원금" 처럼 최근 급부상한 지원금 이슈가
 *   뉴스에 뜨면 자동으로 후보로 수집해 관리자 승인 후 DB 에 추가한다.
 *
 * 필요 환경변수:
 *   NAVER_CLIENT_ID      (https://developers.naver.com 에서 애플리케이션 등록)
 *   NAVER_CLIENT_SECRET
 *
 * API 스펙:
 *   GET https://openapi.naver.com/v1/search/news.json?query=...&display=100&sort=date
 *   Headers: X-Naver-Client-Id, X-Naver-Client-Secret
 *   Response: { items: [{ title, originallink, link, description, pubDate }] }
 *
 * 서비스 정책상 일일 호출 25,000회 제한.
 */

export type NaverNewsItem = {
  title: string;          // HTML 태그 포함 (<b>, </b> 등)
  originallink: string;
  link: string;
  description: string;    // HTML 태그 포함
  pubDate: string;        // RFC 822, 예: "Mon, 22 Apr 2026 09:12:00 +0900"
};

/** 뉴스 제목/본문 HTML 태그 제거 */
export function stripHtml(s: string): string {
  return s
    .replace(/<\/?b>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** 키워드 리스트: 이 중 하나라도 들어가면 "지원금 관련" 뉴스로 판정 */
const SUPPORT_KEYWORDS = [
  '지원금', '보조금', '바우처', '환급금', '장려금',
  '피해지원', '피해보상', '재난지원', '긴급지원',
  '수당', '공제', '소득공제', '세액공제',
  '상생소비', '소상공인', '청년 지원', '신혼 지원',
];

export function isWelfareRelated(text: string): boolean {
  return SUPPORT_KEYWORDS.some((kw) => text.includes(kw));
}

/**
 * 네이버 뉴스 검색.
 * @param query 검색 키워드 (예: "지원금 2026", "긴급재난지원")
 * @param display 가져올 개수 (1~100, 기본 30)
 * @returns 복지 관련으로 필터링된 뉴스 아이템 배열
 */
export async function searchNaverNews(
  query: string,
  display = 30,
): Promise<NaverNewsItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다. ' +
      '발급: https://developers.naver.com/apps/#/list',
    );
  }

  const url = new URL('https://openapi.naver.com/v1/search/news.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(Math.min(100, Math.max(1, display))));
  url.searchParams.set('sort', 'date'); // 최신순

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    // next.js cache 10분
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Naver News API ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { items?: NaverNewsItem[] };
  const items = json.items || [];

  // 복지/지원금 관련만 필터
  return items.filter((it) => {
    const text = `${stripHtml(it.title)} ${stripHtml(it.description)}`;
    return isWelfareRelated(text);
  });
}

/**
 * 여러 키워드로 한 번에 수집 (중복 originallink 제거).
 */
export async function collectTrendingSupportNews(
  queries: string[] = ['지원금', '보조금', '재난지원', '피해지원', '바우처'],
  perQueryLimit = 30,
): Promise<NaverNewsItem[]> {
  const seen = new Set<string>();
  const merged: NaverNewsItem[] = [];

  for (const q of queries) {
    try {
      const items = await searchNaverNews(q, perQueryLimit);
      for (const it of items) {
        const key = it.originallink || it.link;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(it);
      }
    } catch (err) {
      console.warn(`[naver-news] skip "${q}":`, (err as Error).message);
    }
  }

  // pubDate 최신순 정렬
  merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return merged;
}
