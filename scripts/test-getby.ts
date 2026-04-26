import { prisma } from '../lib/prisma';

async function main() {
  const slugs = [
    '서울-청년-기본소득-지원-0',
    '경남-소상공인-지원금-933',
    '충남-국가장학금-지원-385',
  ];
  for (const slug of slugs) {
    const p = await prisma.policy.findFirst({
      where: { slug },
      select: {
        id: true,
        slug: true,
        status: true,
        canonicalId: true,
        category: { select: { slug: true } },
      },
    });
    console.log(`[${slug}]`, p);
  }
  await prisma.$disconnect();
}
main();
