/**
 * Sitemap Ping 유틸
 *
 * ⚠️ 참고: Google 은 2023년에 sitemap ping URL 지원을 공식적으로 폐지함
 * (https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping).
 * 하지만 Bing 의 `www.bing.com/ping` 은 여전히 동작하고, 기타 호환 엔진도 존재.
 *
 * 이 함수는 주로 로그용으로 동작 여부를 기록. 실질 인덱싱은 IndexNow + Google API 로 함.
 */

import type { EngineResult } from './types';
import { SITE_ORIGIN } from './types';

const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;

const PING_TARGETS: { name: string; url: string }[] = [
  { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
  // Google 은 2023년 폐지됐지만 fallback 용도로 호출만 시도
  { name: 'Google', url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}` },
];

export async function pingSitemaps(): Promise<EngineResult> {
  const start = Date.now();
  let ok = 0;
  const errors: string[] = [];

  await Promise.all(
    PING_TARGETS.map(async (target) => {
      try {
        const res = await fetch(target.url, {
          method: 'GET',
          headers: { 'User-Agent': 'govmate-indexer/1.0' },
          // 타임아웃 5초
          signal: AbortSignal.timeout(5_000),
        });
        if (res.ok) {
          ok++;
        } else {
          errors.push(`${target.name}: HTTP ${res.status}`);
        }
      } catch (e) {
        errors.push(`${target.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    })
  );

  const status = ok === PING_TARGETS.length ? 'SUCCESS' : ok > 0 ? 'PARTIAL' : 'FAILED';
  return {
    engine: 'SITEMAP_PING',
    status,
    urlCount: 1, // sitemap.xml 하나
    sampleUrls: [SITEMAP_URL],
    errorMsg: errors.length ? errors.join('; ') : undefined,
    durationMs: Date.now() - start,
    meta: { targets: PING_TARGETS.length, ok },
  };
}
