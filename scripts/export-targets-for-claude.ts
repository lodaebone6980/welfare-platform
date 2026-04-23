/**
 * scripts/export-targets-for-claude.ts
 * ------------------------------------------------------------------
 * Claude 직접 본문 생성용 — 대상 정책을 JSON 으로 덤프.
 *
 * 목적:
 *   OpenAI API 호출 없이 Claude(대화형)가 직접 고품질 본문을 작성하는 파이프라인.
 *   이 스크립트는 "Claude 에게 보여줄 원본 데이터" 를 모아 파일로 저장만 함.
 *
 * 실행 예:
 *   # 기본: 30건 export (content < 200자 인 것 우선)
 *   npx tsx scripts/export-targets-for-claude.ts
 *
 *   # 50건, 특정 카테고리만
 *   LIMIT=50 CATEGORY_SLUG=housing-independence npx tsx scripts/export-targets-for-claude.ts
 *
 *   # 특정 지역만
 *   GEO_REGION=서울특별시 npx tsx scripts/export-targets-for-claude.ts
 *
 *   # 조회수 높은 순 (인기 정책 우선 개선)
 *   ORDER_BY=viewCount LIMIT=30 npx tsx scripts/export-targets-for-claude.ts
 *
 * 출력:
 *   tmp/claude-targets-<타임스탬프>.json
 *   - Claude 가 이 파일을 읽고 각 id 에 대해 본문을 생성,
 *     결과를 tmp/claude-content-<타임스탬프>.json 로 저장하면
 *     import-claude-content.ts 가 DB 에 반영.
 */

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '30', 10));
const CATEGORY_SLUG = process.env.CATEGORY_SLUG || '';
const GEO_REGION = process.env.GEO_REGION || '';
const ORDER_BY = (process.env.ORDER_BY || 'updatedAt') as
  | 'updatedAt'
  | 'viewCount'
  | 'createdAt';

/** needsGeneration 과 동일 기준. (정책 content 가 부실한지) */
function needsGeneration(p: {
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  excerpt?: string | null;
}): boolean {
  const contentLen = (p.content || '').replace(/<[^>]+>/g, '').trim().length;
  if (contentLen < 200) return true;
  if (!p.eligibility || p.eligibility.trim().length < 20) return true;
  if (!p.applicationMethod || p.applicationMethod.trim().length < 20) return true;
  if (!p.excerpt || p.excerpt.trim().length < 20) return true;
  return false;
}

async function main() {
  const where: any = { status: 'PUBLISHED' };
  if (CATEGORY_SLUG) where.category = { slug: CATEGORY_SLUG };
  if (GEO_REGION) where.geoRegion = GEO_REGION;

  const orderBy: any =
    ORDER_BY === 'viewCount'
      ? { viewCount: 'desc' }
      : ORDER_BY === 'createdAt'
        ? { createdAt: 'desc' }
        : { updatedAt: 'asc' };

  // 필터링 후 LIMIT 맞추기 위해 여유분 조회
  const candidates = await prisma.policy.findMany({
    where,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      description: true,
      content: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      deadline: true,
      applyUrl: true,
      geoRegion: true,
      geoDistrict: true,
      tags: true,
      viewCount: true,
      category: { select: { name: true, slug: true } },
    },
    take: LIMIT * 4,
    orderBy,
  });

  const targets = candidates.filter(needsGeneration).slice(0, LIMIT);

  console.log(
    `[export] candidates=${candidates.length} → targets=${targets.length} (orderBy=${ORDER_BY}, category=${CATEGORY_SLUG || 'all'}, region=${GEO_REGION || 'all'})`,
  );

  if (targets.length === 0) {
    console.log('[export] 대상 없음. 조건을 바꿔 다시 실행하세요.');
    await prisma.$disconnect();
    return;
  }

  // Claude 가 읽기 쉬운 형태로 정리
  const payload = targets.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category?.name || null,
    categorySlug: p.category?.slug || null,
    geoRegion: p.geoRegion || null,
    geoDistrict: p.geoDistrict || null,
    deadline: p.deadline || null,
    applyUrl: p.applyUrl || null,
    tags: p.tags || null,
    viewCount: p.viewCount,
    // 원본 — Claude 가 이 안의 정보만 재구성해야 함 (환각 방지)
    original: {
      excerpt: p.excerpt || '',
      description: p.description || '',
      content: p.content || '',
      eligibility: p.eligibility || '',
      applicationMethod: p.applicationMethod || '',
      requiredDocuments: p.requiredDocuments || '',
    },
    // 현재 길이 — Claude 가 어떤 필드를 우선 보강해야 하는지 힌트
    lengths: {
      excerpt: (p.excerpt || '').length,
      content: (p.content || '').replace(/<[^>]+>/g, '').trim().length,
      eligibility: (p.eligibility || '').length,
      applicationMethod: (p.applicationMethod || '').length,
      requiredDocuments: (p.requiredDocuments || '').length,
    },
  }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `claude-targets-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`[export] ✅ saved ${targets.length} targets → ${outPath}`);
  console.log(`[export] 다음 단계:`);
  console.log(`  1) Claude 에게 위 파일 경로를 알려주세요.`);
  console.log(`  2) Claude 가 각 id 에 대해 본문을 작성 후`);
  console.log(`     tmp/claude-content-${ts}.json 파일로 저장.`);
  console.log(`  3) npx tsx scripts/import-claude-content.ts tmp/claude-content-${ts}.json`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
