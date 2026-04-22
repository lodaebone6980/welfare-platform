/**
 * lib/collectors/gov-rss.ts
 * ------------------------------------------------------------------
 * 정부 부처 보도자료 RSS 수집기.
 *
 * 복지 관련 이슈의 "원천" 자료. 언론 보도 전에 부처 보도자료가 먼저 공개되는
 * 경우가 많아 뉴스 API 보다 선제적 반영이 가능하다.
 *
 * 실제 RSS URL 은 각 부처 공식 사이트에서 주기적으로 변경됩니다.
 * 2026-04 기준 확인 필요:
 *   - 보건복지부       https://www.mohw.go.kr
 *   - 고용노동부       https://www.moel.go.kr
 *   - 행정안전부       https://www.mois.go.kr
 *   - 국토교통부       https://www.molit.go.kr
 *   - 교육부           https://www.moe.go.kr
 *   - 여성가족부       https://www.mogef.go.kr
 *   - 중소벤처기업부   https://www.mss.go.kr
 *
 * 운영 팁:
 *   ① 각 부처 사이트 "보도자료 RSS" 메뉴에서 실제 feed URL 획득.
 *   ② GOV_RSS_FEEDS 상수에 배열로 추가.
 *   ③ cron (예: Vercel Cron `vercel.json` crons)으로 1일 1회 호출.
 */

import { isWelfareRelated } from './naver-news';

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string; // 부처명
};

/** 부처 RSS 엔드포인트 목록 (실제 URL 은 각 부처 공개값으로 교체 필요) */
export const GOV_RSS_FEEDS: { name: string; url: string }[] = [
  // 예시: { name: '보건복지부', url: 'https://www.mohw.go.kr/board/rssBoard.es?bid=0027' },
  // 예시: { name: '고용노동부', url: 'https://www.moel.go.kr/news/rssBoardList.do?bbs_cd=1' },
];

/** 초경량 RSS(xml) → item 배열 파서 (marked 같은 외부 라이브러리 불요) */
export function parseRssXml(xml: string, source: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const pick = (tag: string) => {
      const r = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return r ? r[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    items.push({
      title: pick('title'),
      link: pick('link'),
      description: pick('description'),
      pubDate: pick('pubDate'),
      source,
    });
  }
  return items;
}

/**
 * 등록된 모든 부처 RSS 를 조회해 복지 키워드 필터 후 반환.
 */
export async function collectGovNews(): Promise<RssItem[]> {
  if (GOV_RSS_FEEDS.length === 0) {
    console.warn(
      '[gov-rss] GOV_RSS_FEEDS 가 비어있습니다. ' +
      'lib/collectors/gov-rss.ts 에 부처 RSS URL 을 추가하세요.',
    );
    return [];
  }

  const all: RssItem[] = [];
  for (const feed of GOV_RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'WelfareBot/1.0 (+https://govmate.co.kr)' },
        next: { revalidate: 1800 }, // 30분
      });
      if (!res.ok) {
        console.warn(`[gov-rss] ${feed.name} ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseRssXml(xml, feed.name);
      const filtered = items.filter((it) => isWelfareRelated(`${it.title} ${it.description}`));
      all.push(...filtered);
    } catch (err) {
      console.warn(`[gov-rss] ${feed.name} failed:`, (err as Error).message);
    }
  }

  all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return all;
}
