/**
 * IndexNow 클라이언트
 *
 * - Bing / Yandex / Seznam / Naver(일부) / 기타 IndexNow 파트너
 * - 한 번의 POST 로 최대 10,000 URL 전송 가능
 * - 공식 엔드포인트: https://api.indexnow.org/indexnow
 *
 * 환경변수:
 *   INDEXNOW_KEY  (already set: c0685d4c0310152d5b872b826d543df7)
 */

import type { EngineResult } from './types';
import { SITE_ORIGIN } from './types';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const HOST = 'www.govmate.co.kr';
const KEY_LOCATION = `${SITE_ORIGIN}/c0685d4c0310152d5b872b826d543df7.txt`;
const MAX_URLS_PER_REQUEST = 10_000;
const CHUNK_SIZE = 500; // 보수적으로 500개씩 끊어서 전송

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * URL 목록을 IndexNow 로 전송.
 * 성공: HTTP 200 또는 202, 실패는 4xx/5xx
 */
export async function submitToIndexNow(urls: string[]): Promise<EngineResult> {
  const start = Date.now();
  const key = process.env.INDEXNOW_KEY;

  if (!key) {
    return {
      engine: 'INDEXNOW',
      status: 'FAILED',
      urlCount: urls.length,
      sampleUrls: urls.slice(0, 10),
      errorMsg: 'INDEXNOW_KEY env var is missing',
      durationMs: Date.now() - start,
    };
  }

  // 빈 배열 처리
  if (urls.length === 0) {
    return {
      engine: 'INDEXNOW',
      status: 'SUCCESS',
      urlCount: 0,
      sampleUrls: [],
      errorMsg: 'No URLs to submit (no-op)',
      durationMs: Date.now() - start,
    };
  }

  // 중복 제거 & HTTPS 정리
  const uniq = Array.from(new Set(urls.filter((u) => u.startsWith('https://'))));
  const batches = chunk(uniq.slice(0, MAX_URLS_PER_REQUEST), CHUNK_SIZE);

  let successBatches = 0;
  let lastHttp = 0;
  let lastError: string | undefined;

  for (const batch of batches) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'govmate-indexer/1.0',
        },
        body: JSON.stringify({
          host: HOST,
          key,
          keyLocation: KEY_LOCATION,
          urlList: batch,
        }),
      });
      lastHttp = res.status;
      if (res.ok || res.status === 202) {
        successBatches++;
      } else {
        const text = await res.text().catch(() => '');
        lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  const allOk = successBatches === batches.length;
  const status = allOk ? 'SUCCESS' : successBatches > 0 ? 'PARTIAL' : 'FAILED';

  return {
    engine: 'INDEXNOW',
    status,
    httpStatus: lastHttp || undefined,
    urlCount: uniq.length,
    sampleUrls: uniq.slice(0, 10),
    errorMsg: lastError,
    durationMs: Date.now() - start,
    meta: { batches: batches.length, successBatches },
  };
}
