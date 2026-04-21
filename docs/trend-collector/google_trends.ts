/**
 * Google Trends 기반 키워드 수집
 * ------------------------------------------------------------------
 * - google-trends-api (비공식) 패키지 사용
 * - 지역: KR(대한민국), 시간: 최근 1일
 * - '지원금/보조금/환급/바우처/수당/피해지원' 시드 키워드의 interestOverTime을 가져와서
 *   급상승(= 최근 1시간 평균이 지난 24h 평균의 2배 이상)만 TrendKeyword에 저장한다.
 *
 * ⚠ Google Trends는 공식 API가 없고 rate-limit이 있으므로 실패 시 조용히 skip 처리.
 *    (cron 실패로 이어지지 않도록)
 *
 * 환경변수: 없음 (공개 엔드포인트)
 * 의존성: pnpm add google-trends-api
 */

import { PrismaClient, TrendSource } from '@prisma/client';
// @ts-ignore - 이 패키지는 자체 타입을 제공하지 않음
import googleTrends from 'google-trends-api';

const prisma = new PrismaClient();

// 시드 키워드 — Naver DataLab과 일부 겹쳐도 OK (source로 구분)
const SEED_KEYWORDS: string[] = [
  '긴급지원금',
  '재난지원금',
  '피해지원금',
  '유가지원금',
  '소상공인 지원금',
  '에너지 바우처',
  '청년 월세',
  '국가장학금',
  '부모급여',
  '근로장려금',
];

interface TrendPoint {
  time: string; // unix seconds as string
  value: number[];
}

interface InterestOverTimeResponse {
  default: {
    timelineData: TrendPoint[];
  };
}

async function fetchKeyword(keyword: string): Promise<number | null> {
  try {
    const raw = await googleTrends.interestOverTime({
      keyword,
      geo: 'KR',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const parsed = JSON.parse(raw) as InterestOverTimeResponse;
    const timeline = parsed?.default?.timelineData ?? [];
    if (timeline.length === 0) return null;

    // 최근 1포인트 vs 전체 24h 평균
    const values = timeline.map((t) => t.value?.[0] ?? 0);
    const latest = values[values.length - 1];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if (avg === 0) return latest > 0 ? 100 : null;
    const ratio = latest / avg;

    // 급상승 기준: 2배 이상
    if (ratio < 2) return null;

    // 0~100 점수로 환산 (ratio 2 = 40점, 5 = 100점)
    const score = Math.min(100, Math.round(ratio * 20));
    return score;
  } catch (err) {
    // rate-limit / 네트워크 오류는 조용히 skip
    console.warn(`[google_trends] skip "${keyword}":`, (err as Error).message);
    return null;
  }
}

/**
 * 모든 시드 키워드에 대해 Google Trends 조회 → TrendKeyword 저장.
 * @returns 저장된 레코드 수
 */
export async function collectGoogleTrends(): Promise<number> {
  const capturedAt = new Date();
  let saved = 0;

  for (const keyword of SEED_KEYWORDS) {
    const score = await fetchKeyword(keyword);
    // rate-limit 대비 간격
    await new Promise((r) => setTimeout(r, 2000));

    if (score === null) continue;

    await prisma.trendKeyword.create({
      data: {
        keyword,
        source: TrendSource.GOOGLE_TRENDS,
        score,
        newsCount24h: 0, // 뉴스 조인은 generate_candidates 단계에서
        capturedAt,
        normalizedTopic: normalizeTopic(keyword),
      },
    });
    saved += 1;
  }

  console.log(`[google_trends] saved ${saved} rising keywords`);
  return saved;
}

/**
 * 간단 토픽 정규화 — naver_datalab.ts와 동일 로직으로 맞춰둠
 */
export function normalizeTopic(keyword: string): string {
  return keyword
    .replace(/\s+/g, '')
    .replace(/지원금|보조금|수당|바우처|환급|급여/g, '')
    .trim() || keyword;
}
