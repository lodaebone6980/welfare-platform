/**
 * scripts/seed-indexing-queue.ts
 * ----------------------------------------------------------------
 * Naver/Daum 색인 큐 시드 스크립트.
 *
 * - PUBLISHED 정책 전부 또는 최근 N시간 정책의 URL 을
 *   indexing_queue 테이블에 INSERT (NAVER_MANUAL + DAUM_MANUAL 양쪽).
 * - 동일 (url, engine) 이 PENDING/IN_PROGRESS 면 skip.
 *
 * 사용:
 *   npx tsx scripts/seed-indexing-queue.ts                 # 전체 PUBLISHED
 *   HOURS=24 npx tsx scripts/seed-indexing-queue.ts        # 최근 24시간 만
 *   ENGINES=NAVER_MANUAL npx tsx scripts/seed-indexing-queue.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr').replace(/\/$/, '');
const HOURS = process.env.HOURS ? Number(process.env.HOURS) : null;
const ENGINES = (process.env.ENGINES || 'NAVER_MANUAL,DAUM_MANUAL')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

async function main() {
  console.log(`[seed-queue] SITE=${SITE} HOURS=${HOURS ?? 'ALL'} ENGINES=${ENGINES.join(',')}`);

  const where: any = { status: 'PUBLISHED', slug: { not: null } };
  if (HOURS) {
    const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
    where.OR = [{ updatedAt: { gte: since } }, { publishedAt: { gte: since } }];
  }

  const policies = await prisma.policy.findMany({
    where,
    select: { id: true, slug: true },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`[seed-queue] 대상 정책: ${policies.length}건`);

  let inserted = 0;
  let skipped = 0;

  for (const p of policies) {
    if (!p.slug) continue;
    const url = `${SITE}/welfare/${encodeURIComponent(p.slug)}`;
    for (const engine of ENGINES) {
      const exists = await prisma.indexingQueue.findUnique({
        where: { url_engine: { url, engine: engine as any } },
      });
      if (exists) {
        skipped++;
        continue;
      }
      await prisma.indexingQueue.create({
        data: {
          url,
          engine: engine as any,
          status: 'PENDING',
          priority: 0,
          policyId: p.id,
        },
      });
      inserted++;
    }
  }

  console.log(`[seed-queue] 완료: inserted=${inserted}, skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[seed-queue] error:', e);
  process.exit(1);
});
