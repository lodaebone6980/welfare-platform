/**
 * scripts/push-search-engines.ts
 * ------------------------------------------------------------------
 * 4대 검색엔진 통합 색인 푸시: Google / Bing / Naver / Daum.
 *
 * 자동 푸시 가능 여부:
 *   ┌─────────┬──────────────────────────────────────────┐
 *   │ Google  │ ⚠️ 일반 페이지 자동 ping 불가 (Sitemap   │
 *   │         │   ping 2023.06 폐지). Indexing API 는    │
 *   │         │   JobPosting/BroadcastEvent 만 지원.     │
 *   │         │   → Search Console 사이트맵 등록 + 수동  │
 *   │ Bing    │ ✅ IndexNow API 즉시 통지                │
 *   │         │ ✅ www.bing.com/ping 사이트맵 핑          │
 *   │ Naver   │ ⚠️ 공식 색인 API 없음. IndexNow 부분지원  │
 *   │         │   → Search Advisor 수동 사이트맵 등록    │
 *   │ Daum    │ ⚠️ 공식 색인 API 없음.                   │
 *   │         │   → 다음 웹마스터 수동 사이트맵 등록     │
 *   │ Yandex  │ ✅ IndexNow API 즉시 통지 (덤)           │
 *   └─────────┴──────────────────────────────────────────┘
 *
 * 실행:
 *   npx tsx scripts/push-search-engines.ts
 *
 *   # 시간 윈도우 변경 (기본 24시간)
 *   HOURS=72 npx tsx scripts/push-search-engines.ts
 *
 *   # DRY: 전송 안하고 URL 만 출력
 *   DRY=1 npx tsx scripts/push-search-engines.ts
 */
import { PrismaClient } from '@prisma/client';

// ─── INDEXNOW_KEY 자동 설정 ──────────────────────────────────────
// 키는 public/{KEY}.txt 와 동일하며 이미 공개 가능 정보임.
if (!process.env.INDEXNOW_KEY) {
  process.env.INDEXNOW_KEY = 'c0685d4c0310152d5b872b826d543df7';
}

const prisma = new PrismaClient();
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr').replace(/\/$/, '');
const HOURS = Number(process.env.HOURS || 24);
const DRY = process.env.DRY === '1';
const SITEMAP = `${SITE}/sitemap.xml`;
const KEY = process.env.INDEXNOW_KEY!;
const HOST = new URL(SITE).hostname;

type EngineResult = {
  engine: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'MANUAL';
  detail: string;
  durationMs: number;
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

// ─── IndexNow (Bing/Yandex/일부 Naver) ───────────────────────────
async function pingIndexNow(urls: string[], target: string, label: string): Promise<EngineResult> {
  const start = Date.now();
  if (urls.length === 0) return { engine: label, status: 'SUCCESS', detail: '0 urls (no-op)', durationMs: 0 };
  const CHUNK = 500;
  let okBatches = 0, totalBatches = 0, lastErr = '';
  for (let i = 0; i < urls.length; i += CHUNK) {
    totalBatches++;
    const slice = urls.slice(i, i + CHUNK);
    try {
      const res = await withTimeout(fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'govmate-indexer/1.0' },
        body: JSON.stringify({
          host: HOST,
          key: KEY,
          keyLocation: `${SITE}/${KEY}.txt`,
          urlList: slice,
        }),
      }), 15_000);
      if (res.ok || res.status === 202) okBatches++;
      else lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return {
    engine: label,
    status: okBatches === totalBatches ? 'SUCCESS' : okBatches > 0 ? 'PARTIAL' : 'FAILED',
    detail: `batches ${okBatches}/${totalBatches}, urls ${urls.length}${lastErr ? ` (last: ${lastErr})` : ''}`,
    durationMs: Date.now() - start,
  };
}

// ─── Bing 사이트맵 핑 ────────────────────────────────────────────
async function pingBingSitemap(): Promise<EngineResult> {
  const start = Date.now();
  const url = `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`;
  try {
    const res = await withTimeout(fetch(url, { method: 'GET', headers: { 'User-Agent': 'govmate-indexer/1.0' } }), 8_000);
    return {
      engine: 'Bing-Sitemap-Ping',
      status: res.ok ? 'SUCCESS' : 'FAILED',
      detail: `HTTP ${res.status} | ${SITEMAP}`,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return { engine: 'Bing-Sitemap-Ping', status: 'FAILED', detail: (e as Error).message, durationMs: Date.now() - start };
  }
}

// ─── Google: Search Console API (서비스계정 있을 때만) ───────────
async function pushGoogle(urls: string[]): Promise<EngineResult> {
  const start = Date.now();
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const pkey = process.env.GOOGLE_INDEXING_PRIVATE_KEY;
  if (!email || !pkey) {
    return {
      engine: 'Google-Indexing-API',
      status: 'MANUAL',
      detail: 'GOOGLE_INDEXING_CLIENT_EMAIL / PRIVATE_KEY 미설정 → Google Search Console 에서 사이트맵 등록 + URL 검사 수동 진행',
      durationMs: 0,
    };
  }
  // 서비스 계정 있으면 lib/indexing/google-indexing.ts 사용
  try {
    const mod = await import('../lib/indexing/google-indexing');
    const res = await mod.submitToGoogle(urls);
    return {
      engine: 'Google-Indexing-API',
      status: (res.status === 'SUCCESS' || res.status === 'PARTIAL' || res.status === 'FAILED') ? res.status : 'FAILED',
      detail: `urls ${res.urlCount}, http ${res.httpStatus ?? '-'}${res.errorMsg ? ` | ${res.errorMsg}` : ''}`,
      durationMs: res.durationMs,
    };
  } catch (e) {
    return {
      engine: 'Google-Indexing-API',
      status: 'FAILED',
      detail: (e as Error).message,
      durationMs: Date.now() - start,
    };
  }
}

// ─── 메인 ────────────────────────────────────────────────────────
async function main() {
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  console.log(`╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  지원금길잡이 · 4대 검색엔진 색인 푸시                     ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  console.log(`사이트: ${SITE} (${HOST})`);
  console.log(`대상: PUBLISHED 정책 중 updatedAt >= ${since.toISOString()}`);
  console.log(`DRY: ${DRY}`);
  console.log('');

  const recent = await prisma.policy.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ updatedAt: { gte: since } }, { publishedAt: { gte: since } }],
    },
    select: { slug: true },
    orderBy: { updatedAt: 'desc' },
  });

  const policyUrls = recent
    .filter((p) => p.slug)
    .map((p) => `${SITE}/welfare/${encodeURIComponent(p.slug)}`);

  const auxUrls = [
    `${SITE}/`,
    SITEMAP,
    `${SITE}/sitemap-static.xml`,
    `${SITE}/sitemap-categories.xml`,
    `${SITE}/welfare`,
    `${SITE}/categories`,
  ];

  const allUrls = Array.from(new Set([...policyUrls, ...auxUrls])).filter((u) => u.startsWith('https://'));

  console.log(`수집된 URL: 정책 ${policyUrls.length}개 + 보조 ${auxUrls.length}개 = 총 ${allUrls.length}개`);
  console.log(`샘플 (앞5):`);
  allUrls.slice(0, 5).forEach((u) => console.log('  -', u));
  console.log('');

  if (DRY) {
    console.log('[DRY] 전송 생략. 종료.');
    await prisma.$disconnect();
    return;
  }

  console.log('▶ 검색엔진별 푸시 시작 (병렬)...');
  console.log('');

  const [bingIN, bingPing, yandexIN, naverIN, google] = await Promise.all([
    // ① Bing — IndexNow 직통 (가장 안정적)
    pingIndexNow(allUrls, 'https://www.bing.com/indexnow', 'Bing-IndexNow'),
    // ② Bing — 사이트맵 ping (sitemap.xml 갱신)
    pingBingSitemap(),
    // ③ Yandex — IndexNow 직통
    pingIndexNow(allUrls, 'https://yandex.com/indexnow', 'Yandex-IndexNow'),
    // ④ Naver — IndexNow 일반 엔드포인트 (네이버 일부 적용 시도)
    pingIndexNow(allUrls, 'https://api.indexnow.org/indexnow', 'Naver-IndexNow(via api.indexnow.org)'),
    // ⑤ Google — Indexing API (서비스 계정 있을 때만)
    pushGoogle(allUrls),
  ]);

  const results: EngineResult[] = [bingIN, bingPing, yandexIN, naverIN, google];
  console.log('═════ 결과 ═════');
  results.forEach((r) => {
    const icon = r.status === 'SUCCESS' ? '✅' : r.status === 'PARTIAL' ? '🟡' : r.status === 'MANUAL' ? '✋' : '❌';
    console.log(`  ${icon} ${r.engine.padEnd(40)} ${r.status.padEnd(8)} ${r.detail} (${r.durationMs}ms)`);
  });

  console.log('');
  console.log('═════ 수동 단계 안내 ═════');
  console.log('');
  console.log('  📍 Google Search Console (구글)');
  console.log('     https://search.google.com/search-console');
  console.log('     1) 속성 선택: govmate.co.kr');
  console.log(`     2) 좌측 메뉴 → "Sitemaps" → 새 사이트맵 추가: ${SITEMAP}`);
  console.log('     3) 핵심 URL 은 좌측 "URL 검사" → 색인 생성 요청');
  console.log('');
  console.log('  📍 Naver Search Advisor (네이버)');
  console.log('     https://searchadvisor.naver.com/');
  console.log('     1) 사이트 등록 → 소유 확인 (HTML 메타태그 또는 파일)');
  console.log(`     2) 요청 → 사이트맵 제출: ${SITEMAP}`);
  console.log('     3) 요청 → RSS 제출(있다면)');
  console.log('     4) 진단 → 웹페이지 수집 요청 (개별 URL)');
  console.log('');
  console.log('  📍 Daum 검색등록 (다음/카카오)');
  console.log('     https://register.search.daum.net/index.daum');
  console.log('     1) 사이트 등록 (이미 robots.txt 에 인증 코드 등록됨)');
  console.log(`     2) 사이트맵 제출: ${SITEMAP}`);
  console.log('');
  console.log('  📍 Bing Webmaster Tools (덤)');
  console.log('     https://www.bing.com/webmasters');
  console.log(`     1) 사이트맵 등록: ${SITEMAP}`);
  console.log('     (IndexNow 는 자동 통지 완료, GSC 데이터도 가져갈 수 있음)');
  console.log('');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[push-search-engines] error:', e);
  process.exit(1);
});
