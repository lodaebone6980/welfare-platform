import { prisma } from '../lib/prisma';

async function main() {
  // 기존 테스트 3건의 status 먼저 확인
  const debug = await prisma.policy.findMany({
    where: { slug: { in: ['서울-청년-기본소득-지원-0', '경남-소상공인-지원금-933', '충남-국가장학금-지원-385'] } },
    select: { id: true, slug: true, status: true, canonicalId: true },
  });
  console.log('\n=== 기존 테스트 3건 status ===');
  for (const p of debug) console.log(p);

  console.log('\n=== PUBLISHED 중에서 테스트 케이스 3건 재선정 ===');

  const orig = await prisma.policy.findFirst({
    where: { status: 'PUBLISHED', canonicalId: null },
    select: { id: true, slug: true, category: { select: { slug: true } } },
  });
  console.log('[원본]', orig);

  const deriv = await prisma.policy.findFirst({
    where: { status: 'PUBLISHED', canonicalId: { not: null } },
    select: { id: true, slug: true, canonicalId: true, category: { select: { slug: true } } },
  });
  console.log('[파생본]', deriv);

  if (deriv?.canonicalId) {
    const repre = await prisma.policy.findUnique({
      where: { id: deriv.canonicalId },
      select: { id: true, slug: true, status: true, category: { select: { slug: true } } },
    });
    console.log('[파생본의 대표원본]', repre);
  }

  // 고아 = canonicalId=null 이면서 자기를 가리키는 파생본도 없는 policy
  // 간단히 PUBLISHED & canonicalId=null 인 2번째 것 사용
  const orphan = await prisma.policy.findMany({
    where: { status: 'PUBLISHED', canonicalId: null },
    select: { id: true, slug: true, category: { select: { slug: true } } },
    take: 2, skip: 1,
  });
  console.log('[고아 후보]', orphan[0]);

  await prisma.$disconnect();
}
main();
