/**
 * scripts/push-indexnow-after-import.ts
 * ------------------------------------------------------------------
 * import-new-policies(batch1/2/3) + import-claude-content(batch4-orphans) 후
 * 신규/갱신된 정책 URL 목록을 IndexNow 로 전송하여 Bing/Yandex/Naver 즉시 색인.
 *
 * 동작:
 *   1) 최근 수정된(updatedAt 또는 publishedAt 이 24시간 이내) PUBLISHED 정책 slug 수집
 *   2) https://www.govmate.co.kr/welfare/{slug} URL 빌드
 *   3) sitemap 인덱스(sitemap.xml/categories/static) URL 도 함께 포함
 *   4) IndexNow 일괄 전송 (Bing 직통 + IndexNow API 양쪽)
 *
 * 실행:
 *   npx tsx scripts/push-indexnow-after-import.ts
 *
 *   # 특정 시간 윈도우 (예: 1시간 이내)
 *   HOURS=1 npx tsx scripts/push-indexnow-after-import.ts
 *
 *   # DRY: URL 목록만 출력, 실제 전송 안함
 *   DRY=1 npx tsx scripts/push-indexnow-after-import.ts
 */
import { PrismaClient } from '@prisma/client';
import { submitToIndexNow } from '../lib/indexing/indexnow';

const prisma = new PrismaClient();

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr').replace(/\/$/, '');
const HOURS = Number(process.env.HOURS || 24);
const DRY = process.env.DRY === '1';

async function main() {
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  console.log(`[indexnow] 대상: PUBLISHED 정책 중 updatedAt >= ${since.toISOString()}`);
  console.log(`[indexnow] 사이트: ${SITE} | DRY=${DRY}`);

  const recent = await prisma.policy.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { updatedAt: { gte: since } },
        { publishedAt: { gte: since } },
      ],
    },
    select: { id: true, slug: true, title: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`[indexnow] 수집된 정책: ${recent.length}건`);
  if (recent.length === 0) {
    console.log('[indexnow] 전송할 URL 없음. 종료.');
    await prisma.$disconnect();
    return;
  }

  const policyUrls = recent
    .filter((p) => p.slug)
    .map((p) => `${SITE}/welfare/${encodeURIComponent(p.slug)}`);

  // 사이트맵·홈·카테고리 인덱스 동봉(검색엔진 재크롤 유도)
  const auxUrls = [
    `${SITE}/`,
    `${SITE}/sitemap.xml`,
    `${SITE}/sitemap-static.xml`,
    `${SITE}/sitemap-categories.xml`,
    `${SITE}/welfare`,
    `${SITE}/categories`,
  ];

  const all = Array.from(new Set([...policyUrls, ...auxUrls])).filter((u) => u.startsWith('https://'));

  console.log(`[indexnow] 총 전송 URL: ${all.length}건 (정책 ${policyUrls.length} + 인덱스 ${auxUrls.length})`);
  console.log(`[indexnow] 샘플 5건:`);
  all.slice(0, 5).forEach((u) => console.log('  -', u));

  if (DRY) {
    console.log('\n[indexnow] DRY 모드: 실제 전송 생략.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n[indexnow] IndexNow 전송 중...');
  const result = await submitToIndexNow(all);
  console.log('[indexnow] 결과:', JSON.stringify({
    status: result.status,
    httpStatus: result.httpStatus,
    urlCount: result.urlCount,
    durationMs: result.durationMs,
    meta: result.meta,
    errorMsg: result.errorMsg,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[indexnow] 에러:', e);
  process.exit(1);
});
