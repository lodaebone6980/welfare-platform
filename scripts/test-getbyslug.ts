import { prisma } from '../lib/prisma';

async function main() {
  const slugs = [
    '서울-청년-기본소득-지원-0',
    '경남-소상공인-지원금-933',
    '충남-국가장학금-지원-385',
  ];
  for (const s of slugs) {
    try {
      const p: any = await prisma.policy.findFirst({
        where: { slug: s, status: 'PUBLISHED' },
        include: { category: true, faqs: true },
      });
      if (p) console.log(`[${s}] ✅ id=${p.id}, catSlug=${p.category?.slug}, canonicalId=${p.canonicalId}, faqs=${p.faqs?.length}`);
      else   console.log(`[${s}] ❌ NULL`);
    } catch (e: any) {
      console.log(`[${s}] 🔥 ERR:`, e.message?.split('\n')[0]);
    }
  }
  await prisma.$disconnect();
}
main();
