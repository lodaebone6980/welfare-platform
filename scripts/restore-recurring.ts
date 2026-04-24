/**
 * restore-recurring.ts
 *
 * ARCHIVED 된 정책 중 "매년 갱신되는 상시성 제도"를 판별해
 *   · status: ARCHIVED → PUBLISHED
 *   · deadline: '상시' 로 덮어쓰기
 * 로 일괄 복원한다.
 *
 * 판별 키워드 (title에 하나라도 포함되면 상시성으로 간주):
 *   - 기초연금, 장애인연금, 아동수당, 부모급여, 양육수당, 영아수당
 *   - 의료급여, 생계급여, 주거급여, 교육급여, 기초생활
 *   - 국민기초생활, 국가장학금, 보육료, 누리과정
 *   - 실업급여, 구직급여, 청년내일채움
 *   - 한부모가족, 장기요양, 노인장기요양
 *
 * 사용:
 *   DRY_RUN=1 npx tsx scripts/restore-recurring.ts    # 대상만 확인
 *   npx tsx scripts/restore-recurring.ts              # 실제 복원
 *
 * 또는 특정 id 만 지정:
 *   npx tsx scripts/restore-recurring.ts 1352 1903 428 991
 */
import { PrismaClient, PolicyStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

const RECURRING_KEYWORDS = [
  '기초연금',
  '장애인연금',
  '아동수당',
  '부모급여',
  '양육수당',
  '영아수당',
  '의료급여',
  '생계급여',
  '주거급여',
  '교육급여',
  '기초생활',
  '국민기초생활',
  '국가장학금',
  '보육료',
  '누리과정',
  '실업급여',
  '구직급여',
  '청년내일채움',
  '한부모가족',
  '장기요양',
  '노인장기요양',
];

function isRecurring(title: string): string | null {
  for (const kw of RECURRING_KEYWORDS) {
    if (title.includes(kw)) return kw;
  }
  return null;
}

async function main() {
  const explicitIds = process.argv
    .slice(2)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));

  let targets: { id: number; title: string; deadline: string | null; keyword: string }[] = [];

  if (explicitIds.length) {
    const rows = await prisma.policy.findMany({
      where: { id: { in: explicitIds } },
      select: { id: true, title: true, deadline: true, status: true },
    });
    for (const r of rows) {
      const kw = isRecurring(r.title);
      targets.push({ id: r.id, title: r.title, deadline: r.deadline, keyword: kw || '(명시 id)' });
    }
  } else {
    const rows = await prisma.policy.findMany({
      where: { status: 'ARCHIVED' as PolicyStatus },
      select: { id: true, title: true, deadline: true },
    });
    for (const r of rows) {
      const kw = isRecurring(r.title);
      if (kw) targets.push({ id: r.id, title: r.title, deadline: r.deadline, keyword: kw });
    }
  }

  console.log('='.repeat(60));
  console.log(`ARCHIVED 전체 스캔     : ${explicitIds.length ? '명시 id 모드' : '전체'}`);
  console.log(`상시성 복원 대상       : ${targets.length}`);
  console.log(`DRY_RUN                : ${DRY_RUN}`);
  console.log('='.repeat(60));

  // 키워드 분포
  const byKw: Record<string, number> = {};
  for (const t of targets) byKw[t.keyword] = (byKw[t.keyword] || 0) + 1;
  console.log('키워드별 분포:');
  Object.entries(byKw)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(16)} ${String(v).padStart(4)}`));
  console.log('');

  // 샘플
  console.log('샘플 (최대 15건):');
  targets.slice(0, 15).forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.id}] ${t.title}  ← ${t.deadline || '-'} (keyword: ${t.keyword})`);
  });

  // tmp 저장
  const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `restore-recurring-${ts}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), dryRun: DRY_RUN, total: targets.length, byKeyword: byKw, targets },
      null,
      2,
    ),
  );
  console.log('');
  console.log(`[restore-recurring] 📋 대상 저장 → ${outPath}`);

  if (DRY_RUN) {
    console.log('');
    console.log('※ DRY_RUN 모드이므로 DB 변경을 하지 않았습니다.');
    await prisma.$disconnect();
    return;
  }

  if (!targets.length) {
    console.log('대상이 없습니다.');
    await prisma.$disconnect();
    return;
  }

  const ids = targets.map((t) => t.id);
  const res = await prisma.policy.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'PUBLISHED' as PolicyStatus,
      deadline: '상시',
    },
  });
  console.log('');
  console.log(`✅ 복원 완료: ${res.count}건 (status=PUBLISHED, deadline=상시)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
