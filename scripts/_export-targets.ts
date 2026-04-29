/**
 * _export-targets.ts
 * Claude 가 직접 본문 작성할 대상을 N건씩 export.
 * 환경변수: SKIP=0 LIMIT=1 STATUS=ALL
 * 출력: tmp/targets-<ts>.json (id + 원본 데이터)
 */
import { prisma } from '../lib/prisma';
import { needsGeneration } from '../lib/policy-content-generator';
import * as fs from 'fs';
import * as path from 'path';

const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '1', 10));
const SKIP = Math.max(0, parseInt(process.env.SKIP || '0', 10));
const STATUS = (process.env.STATUS || 'ALL').toUpperCase();
// ORDER=POPULAR → viewCount desc (사람들이 많이 본 정책 우선)
// ORDER=ID (기본) → id asc
const ORDER = (process.env.ORDER || 'ID').toUpperCase();

async function main() {
  const where: Record<string, unknown> =
    STATUS === 'ALL'
      ? {}
      : { status: STATUS as 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'REVIEW' };
  const all = await prisma.policy.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
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
      description: true,
      viewCount: true,
      category: { select: { name: true, slug: true } },
    },
    orderBy:
      ORDER === 'POPULAR'
        ? [{ viewCount: 'desc' }, { id: 'asc' }]
        : [{ id: 'asc' }],
  });

  const incomplete = all.filter((p) => needsGeneration(p));
  const targets = incomplete.slice(SKIP, SKIP + LIMIT);

  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const out = path.join(outDir, `targets-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify({
    totalIncomplete: incomplete.length,
    skip: SKIP,
    limit: LIMIT,
    returned: targets.length,
    targets,
  }, null, 2));
  console.log(`총 미완성: ${incomplete.length}, 이번 export: ${targets.length}, SKIP=${SKIP}`);
  console.log(`출력: ${out}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
