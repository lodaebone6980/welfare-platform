/**
 * scripts/inspect-generated-sample.ts
 * 한 정책에 대해 generatePolicyContent 결과를 그대로 콘솔/파일에 덤프해
 * 9-섹션 구조 / callout·steps·cta-apply 클래스 / FAQ / 키워드 밀도를
 * 시각으로 검증.
 *
 * 사용: node --env-file=.env.local --env-file=.env --import=tsx scripts/inspect-generated-sample.ts
 */
import { prisma } from '../lib/prisma';
import { generatePolicyContent } from '../lib/policy-content-generator';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // 본문 미완성 첫 1건
  const candidates = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
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
    take: 5,
    orderBy: { updatedAt: 'asc' },
  });

  const target = candidates.find(
    (c) => (c.content || '').replace(/<[^>]+>/g, '').length < 200,
  );
  if (!target) {
    console.error('No incomplete sample found');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`[inspect] target #${target.id} ${target.title}`);

  const gen = await generatePolicyContent({
    title: target.title,
    category: target.category?.name,
    geoRegion: target.geoRegion,
    description: target.description,
    content: target.content,
    eligibility: target.eligibility,
    applicationMethod: target.applicationMethod,
    requiredDocuments: target.requiredDocuments,
    deadline: target.deadline,
    applyUrl: target.applyUrl,
  });

  if (!gen) {
    console.error('Generation failed');
    await prisma.$disconnect();
    process.exit(2);
  }

  // 키워드 밀도 측정
  const text = gen.content.replace(/<[^>]+>/g, '');
  const fk = gen.focusKeyword;
  const fkHits = (text.match(new RegExp(fk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const ctas = ['신청', '조회', '자격', '지급'];
  const ctaTotal = ctas.reduce(
    (n, k) => n + (text.match(new RegExp(k, 'g')) || []).length,
    0,
  );
  const h2Count = (gen.content.match(/<h2/g) || []).length;
  const calloutCount = (gen.content.match(/class="callout/g) || []).length;
  const stepsCount = (gen.content.match(/class="steps"/g) || []).length;
  const ctaApplyCount = (gen.content.match(/class="cta-apply"/g) || []).length;

  console.log('--- 검증 결과 ---');
  console.log(`title          : ${target.title}`);
  console.log(`focusKeyword   : ${fk}`);
  console.log(`focusKeyword 히트 : ${fkHits}회 (목표 ≥3)`);
  console.log(`행동유도 키워드 합계: ${ctaTotal}회 (목표 ≥5) — 신청/조회/자격/지급`);
  console.log(`H2 섹션 수    : ${h2Count} (목표 9)`);
  console.log(`callout 박스   : ${calloutCount}`);
  console.log(`steps 단계카드: ${stepsCount}`);
  console.log(`cta-apply 버튼: ${ctaApplyCount}`);
  console.log(`평문 본문 길이 : ${text.length}자`);
  console.log(`excerpt 길이   : ${gen.excerpt.length}자`);
  console.log(`eligibility 길이: ${gen.eligibility.length}자`);
  console.log(`applicationMethod 길이: ${gen.applicationMethod.length}자`);
  console.log(`requiredDocuments 길이: ${gen.requiredDocuments.length}자`);
  console.log(`metaDesc 길이  : ${gen.metaDesc.length}자`);
  console.log(`FAQ 개수       : ${gen.faqs.length}`);
  console.log('');
  console.log('--- excerpt ---');
  console.log(gen.excerpt);
  console.log('');
  console.log('--- metaDesc ---');
  console.log(gen.metaDesc);
  console.log('');
  console.log('--- FAQs ---');
  gen.faqs.forEach((f, i) => {
    console.log(`Q${i + 1}. ${f.question}`);
    console.log(`A${i + 1}. ${f.answer}`);
  });

  // 파일 저장 — HTML 본문을 .html로 보면 브라우저로 열 수 있음
  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const baseFile = path.join(outDir, `inspect-sample-${target.id}-${stamp}`);
  fs.writeFileSync(`${baseFile}.json`, JSON.stringify(gen, null, 2));
  fs.writeFileSync(
    `${baseFile}.html`,
    `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${target.title}</title>
<style>
  body{max-width:760px;margin:40px auto;font-family:ui-sans-serif,sans-serif;padding:0 20px;line-height:1.7;color:#111}
  h2{margin-top:32px;border-bottom:2px solid #f97316;padding-bottom:6px}
  .callout{background:#eff6ff;border-left:4px solid #3b82f6;padding:14px 16px;border-radius:6px;margin:14px 0}
  .callout-warn{background:#fff7ed;border-color:#f97316}
  .callout-success{background:#ecfdf5;border-color:#10b981}
  .cta-apply{display:inline-block;background:#f97316;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;margin:8px 0}
  ol.steps{padding-left:0;list-style:none}
  ol.steps li{padding:10px 14px;background:#f9fafb;border-radius:6px;margin:6px 0}
  table{border-collapse:collapse;width:100%;margin:12px 0}
  th,td{border:1px solid #e5e7eb;padding:8px}
  th{background:#f3f4f6}
</style></head><body>
<h1>${target.title}</h1>
<p style="color:#666"><em>${gen.excerpt}</em></p>
${gen.content}
<hr><h2>FAQ</h2>
${gen.faqs.map((f) => `<details><summary><strong>${f.question}</strong></summary><p>${f.answer}</p></details>`).join('\n')}
</body></html>`,
  );
  console.log('');
  console.log(`[inspect] saved → ${baseFile}.json / .html`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
