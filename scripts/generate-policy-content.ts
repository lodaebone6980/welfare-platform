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
// STATUS=ALL → status 필터 제거(PUBLISHED+DRAFT+ARCHIVED 모두 처리)
// STATUS=PUBLISHED|DRAFT|ARCHIVED → 해당 status 만
// 기본값: PUBLISHED (기존 동작 호환)
const STATUS = (process.env.STATUS || 'PUBLISHED').toUpperCase();
// 병렬 호출 개수. gpt-4o tier 4 기준 안전한 동시성. 1=순차(기존)
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '1', 10));

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[gen] OPENAI_API_KEY not set. Abort.');
    process.exit(1);
  }

  // 1) 대상 후보 조회 — 전체 스캔 후 needsGeneration 필터
  const categoryFilter = CATEGORY_SLUG
    ? { category: { slug: CATEGORY_SLUG } }
    : {};
  const statusFilter =
    STATUS === 'ALL'
      ? {}
      : { status: STATUS as 'PUBLISHED' | 'DRAFT' | 'ARCHIVED' | 'REVIEW' };
  const candidates = await prisma.policy.findMany({
    where: { ...statusFilter, ...categoryFilter },
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
    // ORDER_BY 환경변수: POPULAR(viewCount desc) | UNPOPULAR(viewCount asc) | OLDEST(updatedAt asc)
    // 기본: 비인기 우선 — Claude 가 인기 정책 직접 작성하는 흐름과 분리하기 위함
    orderBy:
      (process.env.ORDER_BY || 'UNPOPULAR').toUpperCase() === 'POPULAR'
        ? [{ viewCount: 'desc' }, { id: 'asc' }]
        : (process.env.ORDER_BY || 'UNPOPULAR').toUpperCase() === 'OLDEST'
          ? [{ updatedAt: 'asc' }]
          : [{ viewCount: 'asc' }, { id: 'asc' }],
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
  let processed = 0;

  type Target = (typeof targets)[number];

  async function processOne(p: Target, idx: number): Promise<void> {
    const label = `[${idx + 1}/${targets.length}] #${p.id} ${p.title.slice(0, 30)}`;
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
        return;
      }

      if (DRY) {
        console.log(
          `${label} ✓ (excerpt=${gen.excerpt.length}자 content=${gen.content.length}자 faqs=${gen.faqs.length})`,
        );
        success++;
        return;
      }

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
    } finally {
      processed++;
      if (processed % 25 === 0) {
        console.log(
          `[gen] progress ${processed}/${targets.length} success=${success} failed=${failed}`,
        );
      }
    }
  }

  if (CONCURRENCY <= 1) {
    // 순차 (기존 동작)
    for (let i = 0; i < targets.length; i++) {
      await processOne(targets[i], i);
      await new Promise((r) => setTimeout(r, 200));
    }
  } else {
    // 병렬 풀 — 항상 CONCURRENCY 개의 호출이 동시 진행되도록
    let next = 0;
    async function worker(): Promise<void> {
      while (true) {
        const i = next++;
        if (i >= targets.length) return;
        await processOne(targets[i], i);
      }
    }
    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
  }

  console.log(
    `[gen] done. success=${success} failed=${failed} DRY=${DRY} LIMIT=${LIMIT} CONCURRENCY=${CONCURRENCY} STATUS=${STATUS}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
