/**
 * scripts/snapshot-policies.ts
 * 대량 재생성 전 안전망 — 모든 PUBLISHED 정책의 본문/메타 + 연관 FAQ 를
 * tmp/policy-snapshot-YYYYMMDD.json 로 덤프.
 *
 * 사용: node --env-file=.env.local --env-file=.env --import=tsx scripts/snapshot-policies.ts
 *
 * 복구가 필요하면 scripts/restore-policies.ts 를 별도로 작성해
 * 이 JSON 으로부터 prisma update 를 수행할 수 있다 (현재는 작성하지 않음 — 필요 시 작성).
 */
import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('[snapshot] fetching all PUBLISHED policies...');
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      metaDesc: true,
      focusKeyword: true,
      deadline: true,
      applyUrl: true,
      geoRegion: true,
      geoDistrict: true,
      categoryId: true,
      updatedAt: true,
      faqs: {
        select: {
          id: true,
          question: true,
          answer: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  });

  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const out = path.join(outDir, `policy-snapshot-${stamp}.json`);
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: policies.length,
        policies,
      },
      null,
      2,
    ),
  );
  const stat = fs.statSync(out);
  console.log(
    `[snapshot] saved ${policies.length} policies → ${out} (${(stat.size / 1024).toFixed(0)} KB)`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
