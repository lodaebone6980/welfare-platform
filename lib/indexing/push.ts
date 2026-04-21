/**
 * 인덱싱 오케스트레이터
 *
 * 모든 엔진을 병렬로 호출하고 결과를 DB (IndexingLog) 에 저장.
 *
 * 사용:
 *   import { pushAll, pushUrl } from '@/lib/indexing/push';
 *
 *   await pushAll({ trigger: 'MANUAL_ALL' });
 *   await pushUrl('https://www.govmate.co.kr/welfare/my-slug');
 */

import { prisma } from '@/lib/prisma';
import type { PushResult, IndexingTrigger, EngineResult } from './types';
import { SITE_ORIGIN } from './types';
import { submitToIndexNow } from './indexnow';
import { submitToGoogle } from './google-indexing';
import { pingSitemaps } from './sitemap-ping';

/** 모든 엔진에 URL 푸시 (병렬 실행) */
async function runAllEngines(urls: string[]): Promise<EngineResult[]> {
  const [indexNow, google, sitemap] = await Promise.all([
    submitToIndexNow(urls),
    submitToGoogle(urls),
    pingSitemaps(),
  ]);
  return [indexNow, google, sitemap];
}

/** DB 로그 저장 (실패해도 silent — 인덱싱 자체는 이미 성공했을 수 있으므로) */
async function saveLogs(
  trigger: IndexingTrigger,
  engines: EngineResult[]
): Promise<void> {
  try {
    await prisma.indexingLog.createMany({
      data: engines.map((r) => ({
        triggerType: trigger,
        engine: r.engine,
        urlCount: r.urlCount,
        sampleUrls: r.sampleUrls,
        status: r.status,
        httpStatus: r.httpStatus ?? null,
        errorMsg: r.errorMsg ?? null,
        durationMs: r.durationMs,
        meta: (r.meta as object | undefined) ?? undefined,
      })),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[indexing] failed to save log', e);
  }
}

function aggregateStatus(results: EngineResult[]): 'SUCCESS' | 'PARTIAL' | 'FAILED' {
  const hasFail = results.some((r) => r.status === 'FAILED');
  const hasSuccess = results.some((r) => r.status === 'SUCCESS');
  if (hasFail && hasSuccess) return 'PARTIAL';
  if (hasFail) return 'FAILED';
  return 'SUCCESS';
}

/**
 * 전체 URL 푸시.
 * - 기본적으로 최근 30일 이내에 생성/수정된 policy 를 가져옴
 * - 또는 수동으로 urls 배열을 지정 가능
 */
export async function pushAll(opts: {
  trigger: IndexingTrigger;
  sinceDays?: number;
  limit?: number;
  urls?: string[];
}): Promise<PushResult> {
  const startedAt = new Date().toISOString();

  const {
    trigger,
    sinceDays = 30,
    limit = 5_000,
    urls: overrideUrls,
  } = opts;

  let urls: string[];

  if (overrideUrls && overrideUrls.length > 0) {
    urls = overrideUrls;
  } else {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const policies = await prisma.policy.findMany({
      where: { updatedAt: { gte: since } },
      select: { slug: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    urls = policies.map((p) => `${SITE_ORIGIN}/welfare/${p.slug}`);

    // 홈 + 주요 허브 페이지도 함께 제출 (sitemap 의 핵심)
    urls.unshift(
      `${SITE_ORIGIN}/`,
      `${SITE_ORIGIN}/welfare`,
      `${SITE_ORIGIN}/welfare/categories`,
      `${SITE_ORIGIN}/welfare/search`
    );
  }

  const engines = await runAllEngines(urls);
  const overallStatus = aggregateStatus(engines);

  await saveLogs(trigger, engines);

  return {
    trigger,
    totalUrls: urls.length,
    engines,
    startedAt,
    finishedAt: new Date().toISOString(),
    overallStatus,
  };
}

/**
 * 단일 URL 푸시. 정책 발행 직후 훅에서 호출.
 */
export async function pushUrl(
  url: string,
  trigger: IndexingTrigger = 'PUBLISH_HOOK'
): Promise<PushResult> {
  return pushAll({ trigger, urls: [url] });
}
