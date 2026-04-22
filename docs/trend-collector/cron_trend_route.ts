/**
 * Vercel Cron — 트렌드 수집 파이프라인 엔드포인트
 * ------------------------------------------------------------------
 * 파일 위치: app/api/cron/trends/route.ts
 *
 * 수행 순서:
 *   1) 정부 부처 RSS + 포털 뉴스 수집 (collect_news.collectAll)
 *   2) Naver DataLab 트렌드 수집 (naver_datalab.collectNaverTrends)
 *   3) Google Trends 수집 (google_trends.collectGoogleTrends)
 *   4) 정책 후보 생성 (generate_candidates.generateCandidates)
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 * 스케줄: vercel.json 에 "0 소스/9 12 15 18 ..." (원하는 시간)
 *
 * 실패 격리: 각 단계를 try/catch로 감싸 한 단계 실패가 전체 실패가 되지 않게 함.
 * 모든 결과를 ApiStatus(또는 console)에 로그로 남긴다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectAll } from './collect_news';
import { collectNaverTrends } from './naver_datalab';
import { collectGoogleTrends } from './google_trends';
import { generateCandidates } from './generate_candidates';

export const maxDuration = 60; // Vercel Pro: 60초 이내로 완료

type StepResult = {
  step: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
};

async function runStep(
  name: string,
  fn: () => Promise<unknown>,
): Promise<StepResult> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { step: name, ok: true, result, durationMs: Date.now() - t0 };
  } catch (err) {
    return {
      step: name,
      ok: false,
      error: (err as Error).message,
      durationMs: Date.now() - t0,
    };
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results: StepResult[] = [];

  // Step 1 — News RSS
  results.push(await runStep('news_rss', async () => {
    const r = await collectAll();
    return { sources: r.length, totalFetched: r.reduce((s, x) => s + x.fetched, 0), totalSaved: r.reduce((s, x) => s + x.saved, 0) };
  }));

  // Step 2 — Naver DataLab
  results.push(await runStep('naver_datalab', async () => {
    const saved = await collectNaverTrends();
    return { saved };
  }));

  // Step 3 — Google Trends
  results.push(await runStep('google_trends', async () => {
    const saved = await collectGoogleTrends();
    return { saved };
  }));

  // Step 4 — Candidate generation
  results.push(await runStep('generate_candidates', async () => {
    const created = await generateCandidates();
    return { created };
  }));

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    {
      ok: allOk,
      at: new Date().toISOString(),
      steps: results,
    },
    { status: allOk ? 200 : 207 }, // Multi-Status 207: 일부 실패
  );
}
