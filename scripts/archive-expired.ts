/**
 * archive-expired.ts
 * deadline 이 과거 날짜로 파싱되는 PUBLISHED 정책을 ARCHIVED 로 전환.
 *
 *  - 상시/수시/연중/무기한/별도없음/해당없음 은 미래로 간주하여 건드리지 않는다.
 *  - 파싱 실패 항목도 건드리지 않는다 (사람이 확인해야 함).
 *  - today 기준 diff < 0 인 항목만 ARCHIVED 로 전환.
 *  - 실행 전 반드시 `DRY_RUN=1` 로 미리 확인.
 *
 * 사용:
 *   DRY_RUN=1 npx tsx scripts/archive-expired.ts       # 대상 목록만 출력
 *   npx tsx scripts/archive-expired.ts                  # 실제 전환
 *
 * 결과:
 *   tmp/archive-expired-<ts>.json (전환 대상 id/title/deadline 목록)
 */
import { PrismaClient, PolicyStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

const ALWAYS_REGEX = /상시|수시|연중|무기한|별도없음|해당없음/;

function parseKoreanDate(raw: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const patterns = [
    /(\d{4})\s*[\.\-년]\s*(\d{1,2})\s*[\.\-월]\s*(\d{1,2})/,
    /(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const all = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' as PolicyStatus },
    select: { id: true, slug: true, title: true, deadline: true, geoRegion: true },
  });

  const targets: { id: number; slug: string; title: string; deadline: string; region: string | null; daysPast: number }[] = [];

  for (const p of all) {
    const raw = p.deadline || '';
    if (!raw.trim()) continue;
    if (ALWAYS_REGEX.test(raw)) continue;
    const d = parseKoreanDate(raw);
    if (!d) continue;
    const diffMs = d.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (86400 * 1000));
    if (diffDays < 0) {
      targets.push({
        id: p.id,
        slug: p.slug,
        title: p.title,
        deadline: raw,
        region: p.geoRegion,
        daysPast: -diffDays,
      });
    }
  }

  console.log('='.repeat(60));
  console.log(`PUBLISHED 전체   : ${all.length}`);
  console.log(`과거 마감 대상  : ${targets.length}`);
  console.log(`DRY_RUN         : ${DRY_RUN}`);
  console.log('='.repeat(60));

  // 지역별 분포
  const byRegion: Record<string, number> = {};
  for (const t of targets) {
    const k = t.region || '(전국)';
    byRegion[k] = (byRegion[k] || 0) + 1;
  }
  console.log('지역별 분포:');
  Object.entries(byRegion)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => {
      console.log(`  ${k.padEnd(16)} ${String(v).padStart(4)}`);
    });
  console.log('');

  // 샘플
  console.log('샘플 (가장 오래 지난 10건):');
  targets
    .sort((a, b) => b.daysPast - a.daysPast)
    .slice(0, 10)
    .forEach((t, i) => {
      console.log(`  ${i + 1}. [${t.id}] ${t.title}  ← ${t.deadline} (${t.daysPast}일 경과)`);
    });

  // tmp 저장
  const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `archive-expired-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, total: targets.length, byRegion, targets }, null, 2));
  console.log('');
  console.log(`[archive-expired] 📋 대상 저장 → ${outPath}`);

  if (DRY_RUN) {
    console.log('');
    console.log('※ DRY_RUN 모드이므로 DB 변경을 하지 않았습니다.');
    console.log('   실제 전환: npx tsx scripts/archive-expired.ts (DRY_RUN 미설정)');
    await prisma.$disconnect();
    return;
  }

  if (!targets.length) {
    console.log('전환 대상이 없습니다.');
    await prisma.$disconnect();
    return;
  }

  // 실제 전환
  const ids = targets.map((t) => t.id);
  const res = await prisma.policy.updateMany({
    where: { id: { in: ids }, status: 'PUBLISHED' as PolicyStatus },
    data: { status: 'ARCHIVED' as PolicyStatus },
  });
  console.log('');
  console.log(`✅ ARCHIVED 전환 완료: ${res.count}건`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
