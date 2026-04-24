/**
 * content-status.ts
 * 전체 PUBLISHED 정책의 본문 생성 현황을 카테고리·지역·마감일 기준으로 집계합니다.
 *
 * 사용: npx tsx scripts/content-status.ts
 * 결과: 콘솔 출력 + tmp/content-status-<ts>.json 저장
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type P = {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  eligibility: string | null;
  applicationMethod: string | null;
  deadline: string | null;
  viewCount: number;
  publishedAt: Date | null;
  geoRegion: string | null;
  category: { slug: string; name: string } | null;
};

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function needsGeneration(p: P): boolean {
  const contentLen = stripHtml(p.content).length;
  const excerptLen = (p.excerpt || '').trim().length;
  const eligLen = (p.eligibility || '').trim().length;
  const applyLen = (p.applicationMethod || '').trim().length;
  return contentLen < 200 || excerptLen < 20 || eligLen < 20 || applyLen < 20;
}

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
  const all = (await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      content: true,
      excerpt: true,
      eligibility: true,
      applicationMethod: true,
      deadline: true,
      viewCount: true,
      publishedAt: true,
      geoRegion: true,
      category: { select: { slug: true, name: true } },
    },
  })) as P[];

  const total = all.length;
  const needFull = all.filter(needsGeneration);
  const ok = total - needFull.length;

  console.log('='.repeat(60));
  console.log('전체 PUBLISHED 정책 현황');
  console.log('='.repeat(60));
  console.log(`전체 발행(PUBLISHED)   : ${total}`);
  console.log(`본문 완성(OK)          : ${ok}  (${((ok / total) * 100).toFixed(1)}%)`);
  console.log(`본문 미완성(needsGen)  : ${needFull.length}  (${((needFull.length / total) * 100).toFixed(1)}%)`);
  console.log('');

  // 부족 원인 브레이크다운
  const lack = {
    contentShort: 0,
    excerptShort: 0,
    eligShort: 0,
    applyShort: 0,
  };
  for (const p of all) {
    if (stripHtml(p.content).length < 200) lack.contentShort++;
    if ((p.excerpt || '').length < 20) lack.excerptShort++;
    if ((p.eligibility || '').length < 20) lack.eligShort++;
    if ((p.applicationMethod || '').length < 20) lack.applyShort++;
  }
  console.log('부족 항목 분포 (중복 집계):');
  console.log(`  content < 200자           : ${lack.contentShort}`);
  console.log(`  excerpt < 20자            : ${lack.excerptShort}`);
  console.log(`  eligibility < 20자        : ${lack.eligShort}`);
  console.log(`  applicationMethod < 20자  : ${lack.applyShort}`);
  console.log('');

  // 카테고리별
  const byCat: Record<string, { total: number; need: number }> = {};
  for (const p of all) {
    const k = p.category?.name || '(미분류)';
    byCat[k] ||= { total: 0, need: 0 };
    byCat[k].total++;
    if (needsGeneration(p)) byCat[k].need++;
  }
  console.log('카테고리별 (총 개수 내림차순):');
  Object.entries(byCat)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([k, v]) => {
      const rate = ((v.total - v.need) / v.total) * 100;
      console.log(`  ${k.padEnd(12)} 전체 ${String(v.total).padStart(4)}  미완성 ${String(v.need).padStart(4)}  완성률 ${rate.toFixed(1)}%`);
    });
  console.log('');

  // 지역별 (상위 20)
  const byRegion: Record<string, { total: number; need: number }> = {};
  for (const p of all) {
    const k = p.geoRegion || '(전국/미지정)';
    byRegion[k] ||= { total: 0, need: 0 };
    byRegion[k].total++;
    if (needsGeneration(p)) byRegion[k].need++;
  }
  console.log('지역별 (상위 20):');
  Object.entries(byRegion)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .forEach(([k, v]) => {
      console.log(`  ${k.padEnd(16)} 전체 ${String(v.total).padStart(4)}  미완성 ${String(v.need).padStart(4)}`);
    });
  console.log('');

  // deadline 상태
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let always = 0;
  let past = 0;
  let futureParseable = 0;
  let unparseable = 0;
  const dayBuckets = { d0_14: 0, d15_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, d181plus: 0 };
  for (const p of all) {
    const raw = p.deadline || '';
    if (!raw.trim() || /상시|수시|연중|무기한|별도없음|해당없음/.test(raw)) {
      always++;
      continue;
    }
    const d = parseKoreanDate(raw);
    if (!d) {
      unparseable++;
      continue;
    }
    const diff = Math.round((d.getTime() - today.getTime()) / (86400 * 1000));
    if (diff < 0) past++;
    else {
      futureParseable++;
      if (diff <= 14) dayBuckets.d0_14++;
      else if (diff <= 30) dayBuckets.d15_30++;
      else if (diff <= 60) dayBuckets.d31_60++;
      else if (diff <= 90) dayBuckets.d61_90++;
      else if (diff <= 180) dayBuckets.d91_180++;
      else dayBuckets.d181plus++;
    }
  }
  console.log('deadline 상태:');
  console.log(`  상시/수시/연중/공란  : ${always}`);
  console.log(`  과거 마감(만료)      : ${past}`);
  console.log(`  미래 마감(파싱됨)    : ${futureParseable}`);
  console.log(`    ├─ D-0  ~ D-14    : ${dayBuckets.d0_14}`);
  console.log(`    ├─ D-15 ~ D-30    : ${dayBuckets.d15_30}`);
  console.log(`    ├─ D-31 ~ D-60    : ${dayBuckets.d31_60}`);
  console.log(`    ├─ D-61 ~ D-90    : ${dayBuckets.d61_90}`);
  console.log(`    ├─ D-91 ~ D-180   : ${dayBuckets.d91_180}`);
  console.log(`    └─ D-181+         : ${dayBuckets.d181plus}`);
  console.log(`  파싱 불가            : ${unparseable}`);
  console.log('');

  // 샘플 추출: 완성된 본문 5건 / 미완성 5건
  const okSamples = all.filter((p) => !needsGeneration(p)).slice(0, 5);
  const needSamples = needFull.slice(0, 5);

  console.log('✅ 완성된 본문 샘플 (5건):');
  okSamples.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}] ${p.title}  (content=${stripHtml(p.content).length}자, 조회수 ${p.viewCount})`);
  });
  console.log('');
  console.log('❌ 미완성 본문 샘플 (5건):');
  needSamples.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}] ${p.title}  (content=${stripHtml(p.content).length}자, excerpt=${(p.excerpt || '').length}자)`);
  });

  // JSON 파일로 저장
  const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `content-status-${ts}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total,
        ok,
        needFull: needFull.length,
        completionRate: ok / total,
        lack,
        byCategory: byCat,
        byRegion: byRegion,
        deadlineBuckets: dayBuckets,
        deadlineSummary: { always, past, futureParseable, unparseable },
      },
      null,
      2
    )
  );
  console.log('');
  console.log(`[content-status] 📊 JSON 저장됨 → ${outPath}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
