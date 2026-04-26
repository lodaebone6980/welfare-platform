import { prisma } from '../lib/prisma';

async function main() {
  for (let i = 1; i <= 3; i++) {
    try {
      const n = await prisma.policy.count();
      console.log(`✅ wakeup OK (try ${i}), rows=`, n);
      await prisma.$disconnect();
      return;
    } catch (e: any) {
      console.log(`⏳ try ${i} failed: ${e.message?.split('\n')[0]}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.log('❌ DB 3회 재시도 모두 실패 — Neon console 확인 필요');
  process.exit(1);
}
main();
