import { prisma } from '../lib/prisma';

async function main() {
  const total = await prisma.policy.count();
  const byStatus = await prisma.policy.groupBy({ by: ['status'], _count: true });
  console.log('총 Policy 행수:', total);
  console.log('status 분포:');
  byStatus.forEach((r) => console.log(`  ${r.status}: ${r._count}`));
  await prisma.$disconnect();
}
main();
