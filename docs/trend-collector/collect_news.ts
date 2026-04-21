// src/lib/trend-collector/collect-news.ts
//
// RSS → NewsItem 수집기.
// 실행: 30분마다 Vercel Cron 또는 수동 트리거.

import Parser from 'rss-parser';
import { prisma } from '@/lib/prisma';
import {
  RSS_SOURCES,
  shouldCollect,
  extractMatchedKeywords,
} from './news-rss-sources';

const parser = new Parser({
  headers: {
    'User-Agent': 'GovmateBot/1.0 (+https://govmate.co.kr/about)',
  },
  timeout: 15_000,
});

export type CollectResult = {
  sourceKey: string;
  fetched: number;
  saved: number;
  skippedNotMatching: number;
  skippedDuplicate: number;
  error?: string;
};

export async function collectAll(): Promise<CollectResult[]> {
  const results: CollectResult[] = [];
  for (const src of RSS_SOURCES) {
    if (!src.enabled) continue;
    try {
      const res = await collectFromSource(src.key);
      results.push(res);
    } catch (err: any) {
      results.push({
        sourceKey: src.key,
        fetched: 0,
        saved: 0,
        skippedNotMatching: 0,
        skippedDuplicate: 0,
        error: String(err?.message ?? err),
      });
    }
    // 소스 간 rate limit 준수: 1.5초 간격
    await new Promise((r) => setTimeout(r, 1500));
  }
  return results;
}

export async function collectFromSource(sourceKey: string): Promise<CollectResult> {
  const src = RSS_SOURCES.find((s) => s.key === sourceKey);
  if (!src) throw new Error(`Unknown source ${sourceKey}`);

  const feed = await parser.parseURL(src.url);
  const items = feed.items ?? [];

  let saved = 0;
  let skippedNotMatching = 0;
  let skippedDuplicate = 0;

  for (const it of items) {
    const title = (it.title ?? '').trim();
    const link = (it.link ?? '').trim();
    const summary = stripHtml((it.contentSnippet ?? it.content ?? it.summary ?? '') as string).slice(0, 2000);
    const pubRaw = it.isoDate ?? it.pubDate;
    if (!title || !link || !pubRaw) continue;

    const text = `${title}\n${summary}`;
    if (!shouldCollect(text)) {
      skippedNotMatching++;
      continue;
    }

    const matched = extractMatchedKeywords(text);

    try {
      await prisma.newsItem.create({
        data: {
          source: src.key,
          url: link,
          title,
          summary: summary || null,
          publishedAt: new Date(pubRaw),
          agency: src.agency || null,
          matchedKeywords: matched,
        },
      });
      saved++;
    } catch (e: any) {
      // Unique 제약 위반 = 이미 수집된 URL
      if (String(e?.code) === 'P2002') {
        skippedDuplicate++;
      } else {
        // 알 수 없는 에러는 throw 해서 CollectionRun 실패 로그로 기록
        throw e;
      }
    }
  }

  return {
    sourceKey: src.key,
    fetched: items.length,
    saved,
    skippedNotMatching,
    skippedDuplicate,
  };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
