import { prisma } from '../lib/prisma';

const claudeIds = [
  1, 2, 4, 7, 8, 11, 13, 14, 15, 17, 64, 183, 196, 215, 247, 329, 350, 371, 442,
  988, 1005, 1235, 1251, 1304, 1440, 1501, 1539, 1588, 1709, 1712, 1775, 1807,
  1914, 1965, 2021, 2280, 2309, 2419, 2426, 2439, 2498,
];

async function main() {
  const claude = await prisma.policy.findMany({
    where: { id: { in: claudeIds } },
    select: { id: true, slug: true, title: true },
    orderBy: { id: 'asc' },
  });
  console.log('=== Claude 직접 작성 (' + claude.length + '건) ===');
  claude.forEach((p) => {
    console.log(`#${p.id}\thttps://www.govmate.co.kr/welfare/${p.slug}\t${p.title}`);
  });
  console.log();
  // OpenAI 작성된 것 — claudeIds 제외 + content가 v2 표준 (callout 포함) 인 것 5건 샘플
  const openai = await prisma.policy.findMany({
    where: {
      id: { notIn: claudeIds },
      status: 'PUBLISHED',
      content: { contains: 'callout-info' },
    },
    select: { id: true, slug: true, title: true },
    orderBy: { viewCount: 'desc' },
    take: 8,
  });
  console.log('=== OpenAI 자동 작성 샘플 (' + openai.length + '건) ===');
  openai.forEach((p) => {
    console.log(`#${p.id}\thttps://www.govmate.co.kr/welfare/${p.slug}\t${p.title}`);
  });
  await prisma.$disconnect();
}
main();
