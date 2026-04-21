// src/lib/trend-collector/naver-datalab.ts
//
// Naver DataLab 검색 트렌드 API 래퍼.
// 사전 준비:
//   1) https://developers.naver.com 에서 애플리케이션 등록
//   2) 환경변수 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 설정
//   3) API 사용 신청: "검색어 트렌드"

import { prisma } from '@/lib/prisma';
import { TrendSource } from '@prisma/client';

const DATALAB_URL = 'https://openapi.naver.com/v1/datalab/search';

// 추적할 키워드 그룹 (최대 5개까지 한 번에)
const KEYWORD_GROUPS = [
  {
    groupName: '긴급지원금',
    keywords: ['긴급지원금', '재난지원금', '피해지원금', '특별지원금', '유가 피해지원'],
  },
  {
    groupName: '환급·바우처',
    keywords: ['자동차세 환급', '건강보험 환급', '에너지바우처', '문화누리카드', '첫만남이용권'],
  },
  {
    groupName: '청년·신혼',
    keywords: ['청년월세', '청년 버팀목', '신혼부부 전세대출', '청년도약계좌', '청년일자리도약'],
  },
  {
    groupName: '출산·육아',
    keywords: ['부모급여', '아동수당', '출산장려금', '아이돌봄', '양육수당'],
  },
];

type DataLabResponse = {
  startDate: string;
  endDate: string;
  timeUnit: string;
  results: {
    title: string;
    keywords: string[];
    data: { period: string; ratio: number }[];
  }[];
};

export async function fetchNaverDataLab(
  startDate: string, // 'YYYY-MM-DD'
  endDate: string,
  timeUnit: 'date' | 'week' | 'month' = 'date',
): Promise<DataLabResponse[]> {
  const { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET } = process.env;
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not set');
  }

  const results: DataLabResponse[] = [];

  for (const group of KEYWORD_GROUPS) {
    const body = {
      startDate,
      endDate,
      timeUnit,
      keywordGroups: group.keywords.map((k) => ({ groupName: k, keywords: [k] })),
    };

    const res = await fetch(DATALAB_URL, {
      method: 'POST',
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Naver DataLab ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as DataLabResponse;
    results.push(data);
    // Rate limit 준수
    await new Promise((r) => setTimeout(r, 1000));
  }

  return results;
}

/**
 * 지난 7일 평균 대비 오늘 상승률을 트렌드 점수로 환산.
 * 100 기준, 예: 오늘 80 / 지난주 평균 20 → score = 80/20 × 20 = 80
 */
export async function collectNaverTrends(): Promise<number> {
  const today = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(today);
  start.setDate(start.getDate() - 30);

  const datalabResults = await fetchNaverDataLab(ymd(start), ymd(today), 'date');

  let saved = 0;
  const now = new Date();

  for (const group of datalabResults) {
    for (const kw of group.results) {
      const data = kw.data;
      if (data.length < 8) continue;

      const recentAvg = data.slice(-1)[0]?.ratio ?? 0;
      const past7Avg =
        data.slice(-8, -1).reduce((s, d) => s + d.ratio, 0) / 7 || 1;

      const score = Math.min(100, (recentAvg / past7Avg) * 20); // 대략 0~100

      await prisma.trendKeyword.create({
        data: {
          keyword: kw.keywords[0],
          source: TrendSource.NAVER_DATALAB,
          score,
          capturedAt: now,
          normalizedTopic: normalizeTopic(kw.keywords[0]),
        },
      });
      saved++;
    }
  }

  return saved;
}

export function normalizeTopic(keyword: string): string {
  return keyword
    .replace(/\s+/g, '_')
    .replace(/[^가-힣a-zA-Z0-9_]/g, '')
    .toLowerCase();
}
