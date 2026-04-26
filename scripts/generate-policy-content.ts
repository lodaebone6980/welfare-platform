/**
 * scripts/generate-policy-content.ts
 * ------------------------------------------------------------------
 * 콘텐츠가 부실한 정책을 골라 LLM 으로 본문 + FAQ 를 생성해 DB 에 저장.
 *
 * 실행:
 *   # 드라이런 (DB 업데이트 X, 로그만)
 *   DRY=1 npx tsx scripts/generate-policy-content.ts
 *
 *   # 50건만 실행
 *   LIMIT=50 npx tsx scripts/generate-policy-content.ts
 *
 *   # 특정 카테고리만
 *   CATEGORY_SLUG=housing-independence npx tsx scripts/generate-policy-content.ts
 *
 * 비용 가드:
 *   - gpt-4o-mini 고정 (정책당 약 $0.001~0.002)
 *   - LIMIT 환경변수로 1회 실행 범위 제한 (기본 100)
 *   - 실패 시 해당 정책은 스킵, 다음으로 진행
 */

import { prisma } from '../lib/prisma';
import {
  generatePolicyContent,
  needsGeneration,
} from '../lib/policy-content-generator';

const DRY = process.env.DRY === '1' || process.argv.includes('--dry');
const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '100', 10));
const CATEGORY_SLUG = process.env.CATEGORY_SLUG || '';

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[gen] OPENAI_API_KEY not set. Abort.');
    process.exit(1);
  }

  // 1) 대상 후보 조회 — 전체 스캔 후 needsGeneration 필터
  const categoryFilter = CATEGORY_SLUG
    ? { category: { slug: CATEGORY_SLUG } }
    : {};
  const candidates = await prisma.policy.findMany({
    where: { status: 'PUBLISHED', ...categoryFilter },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      description: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      excerpt: true,
      deadline: true,
      applyUrl: true,
      geoRegion: true,
      category: { select: { name: true, slug: true } },
    },
    take: LIMIT * 3, // 여유분 확보 (필터링 후 LIMIT 맞추기 위해)
    orderBy: { updatedAt: 'asc' }, // 오래된 것부터
  });

  const targets = candidates.filter((p) => needsGeneration(p)).slice(0, LIMIT);

  console.log(
    `[gen] candidates=${candidates.length} → targets=${targets.length} (DRY=${DRY})`,
  );
  if (targets.length === 0) {
    console.log('[gen] nothing to do');
    await prisma.$disconnect();
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const label = `[${i + 1}/${targets.length}] #${p.id} ${p.title.slice(0, 30)}`;
    try {
      const gen = await generatePolicyContent({
        title: p.title,
        category: p.category?.name,
        geoRegion: p.geoRegion,
        description: p.description,
        content: p.content,
        eligibility: p.eligibility,
        applicationMethod: p.applicationMethod,
        requiredDocuments: p.requiredDocuments,
        deadline: p.deadline,
        applyUrl: p.applyUrl,
      });

      if (!gen) {
        console.warn(`${label} — LLM returned invalid JSON, skip`);
        failed++;
        continue;
      }

      if (DRY) {
        console.log(
          `${label} ✓ (excerpt=${gen.excerpt.length}자 content=${gen.content.length}자 faqs=${gen.faqs.length})`,
        );
        success++;
        continue;
      }

      // 2) DB 업데이트 (트랜잭션: Policy + Faq 교체)
      await prisma.$transaction(async (tx) => {
        await tx.policy.update({
          where: { id: p.id },
          data: {
            excerpt: gen.excerpt,
            content: gen.content,
            eligibility: gen.eligibility,
            applicationMethod: gen.applicationMethod,
            requiredDocuments: gen.requiredDocuments,
            metaDesc: gen.metaDesc,
            focusKeyword: gen.focusKeyword,
          },
        });

        // FAQ 는 기존 것 지우고 새로 생성 (AEO 신뢰도)
        if (gen.faqs.length > 0) {
          await tx.faq.deleteMany({ where: { policyId: p.id } });
          await tx.faq.createMany({
            data: gen.faqs.map((f) => ({
              policyId: p.id,
              question: f.question,
              answer: f.answer,
            })),
          });
        }
      });

      success++;
      console.log(`${label} ✅ saved`);
    } catch (err) {
      failed++;
      console.warn(`${label} ❌`, (err as Error).message);
    }

    // rate limit 안전 텀 (OpenAI 기본 제한 방어)
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(
    `[gen] done. success=${success} failed=${failed} DRY=${DRY} LIMIT=${LIMIT}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
