/**
 * scripts/promote-to-published.ts
 * 풍부화 검증을 통과한 DRAFT/ARCHIVED 정책을 PUBLISHED 로 일괄 승격.
 *
 * 안전장치:
 *   - needsGeneration() 통과(=풍부함)한 것만 승격
 *   - DRY=1 로 사전 검증
 *
 * 사용:
 *   DRY=1 node --env-file=.env.local --env-file=.env --import=tsx scripts/promote-to-published.ts
 *   node --env-file=.env.local --env-file=.env --import=tsx scripts/promote-to-published.ts
 */
import { prisma } from '../lib/prisma';
import { needsGeneration } from '../lib/policy-content-generator';

const DRY = process.env.DRY === '1';

async function main() {
  const candidates = await prisma.policy.findMany({
    where: { status: { in: ['DRAFT', 'ARCHIVED'] } },
    select: {
      id: true,
      title: true,
      status: true,
      content: true,
      excerpt: true,
      eligibility: true,
      applicationMethod: true,
      metaDesc: true,
      focusKeyword: true,
    },
  });

  const ready: number[] = [];
  const notReady: { id: number; title: string; status: string }[] = [];
  for (const p of candidates) {
    if (needsGeneration(p)) {
      notReady.push({ id: p.id, title: p.title, status: p.status });
    } else {
      ready.push(p.id);
    }
  }

  console.log(`총 DRAFT/ARCHIVED: ${candidates.length}`);
  console.log(`승격 가능(풍부함): ${ready.length}`);
  console.log(`아직 빈약(skip)  : ${notReady.length}`);
  if (notReady.length > 0) {
    console.log('--- 아직 빈약한 정책 (앞 10건) ---');
    notReady.slice(0, 10).forEach((p) =>
      console.log(`  #${p.id} [${p.status}] ${p.title.slice(0, 50)}`),
    );
  }

  if (DRY) {
    console.log('[DRY] 실제 승격은 수행하지 않음. DRY 환경변수 빼고 다시 실행하세요.');
    await prisma.$disconnect();
    return;
  }

  if (ready.length === 0) {
    console.log('승격할 정책이 없습니다.');
    await prisma.$disconnect();
    return;
  }

  // publishedAt 미설정인 것들은 이번에 채움 (sitemap·canonical에 영향)
  const now = new Date();
  const result = await prisma.$transaction([
    prisma.policy.updateMany({
      where: { id: { in: ready }, publishedAt: null },
      data: { status: 'PUBLISHED', publishedAt: now },
    }),
    prisma.policy.updateMany({
      where: { id: { in: ready }, publishedAt: { not: null } },
      data: { status: 'PUBLISHED' },
    }),
  ]);
  console.log(
    `[promote] PUBLISHED 로 변경: 신규 publishedAt=${result[0].count} / 기존 publishedAt 보존=${result[1].count}`,
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
