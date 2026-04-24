/**
 * identify-canonical.ts
 *
 * 17개 지자체에 중복 복제된 "국가 공통 정책" 들을 그룹핑 해 canonical 원본 1건을 선정한다.
 * 실제 DB 변경은 하지 않고 tmp/canonical-groups-<ts>.json 에 결과만 저장한다.
 *
 * 그루핑 키:
 *   normalizeTitle(title) + "|" + categorySlug
 *   (예: "[대구광역시] 의료급여 지원" → "의료급여 지원|medical")
 *
 * canonical 선정 우선순위:
 *   1. geoRegion 이 '전국' 또는 NULL
 *   2. viewCount 가 가장 높은 행
 *   3. publishedAt 이 가장 오래된 행
 *   4. id 가 가장 작은 행
 *
 * 출력:
 *   tmp/canonical-groups-<ts>.json
 *     {
 *       summary: { total, groups, solo },
 *       groups: [
 *         { key, canonicalId, canonicalTitle, categorySlug, derivatives: [...], count }
 *       ],
 *       solo: [ { id, title, geoRegion, categorySlug } ]
 *     }
 *
 * 사용:
 *   npx tsx scripts/identify-canonical.ts
 */
import { PrismaClient, PolicyStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// 지역 접두사 패턴 — 제목 앞에 붙는 대괄호·괄호 표현
const REGION_PREFIX_PATTERNS = [
  /^\[[^\]]+\]\s*/,          // [서울광역시]
  /^\([^)]+\)\s*/,           // (서울)
  /^[가-힣]+(특별시|특별자치시|광역시|특별자치도|도)\s+/, // "서울특별시 "
  /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s+/,
];

// 지역명으로 끝나는 경우도 제거 ("...지원(서울)")
const REGION_SUFFIX = /\s*[\(\[][^)\]]*(시|도)[\)\]]\s*$/;

function normalizeTitle(title: string): string {
  let t = title.trim();
  for (const re of REGION_PREFIX_PATTERNS) {
    t = t.replace(re, '');
  }
  t = t.replace(REGION_SUFFIX, '');
  // 다중 공백 정리 & 소괄호 안 지역만 있는 경우 제거
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

type P = {
  id: number;
  slug: string;
  title: string;
  geoRegion: string | null;
  category: { slug: string; name: string } | null;
  publishedAt: Date | null;
  viewCount: number;
  status: PolicyStatus;
};

function pickCanonical(rows: P[]): P {
  // 1) geoRegion == '전국' 또는 NULL
  const national = rows.filter((r) => !r.geoRegion || r.geoRegion === '전국');
  if (national.length === 1) return national[0];
  const pool = national.length > 0 ? national : rows;

  // 2) viewCount desc → 3) publishedAt asc → 4) id asc
  return pool.sort((a, b) => {
    if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
    const ap = a.publishedAt ? a.publishedAt.getTime() : Infinity;
    const bp = b.publishedAt ? b.publishedAt.getTime() : Infinity;
    if (ap !== bp) return ap - bp;
    return a.id - b.id;
  })[0];
}

async function main() {
  const all = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' as PolicyStatus },
    select: {
      id: true,
      slug: true,
      title: true,
      geoRegion: true,
      publishedAt: true,
      viewCount: true,
      status: true,
      category: { select: { slug: true, name: true } },
    },
  });

  console.log(`PUBLISHED 전체: ${all.length}`);

  // 그루핑
  const buckets = new Map<string, P[]>();
  for (const p of all as P[]) {
    const normTitle = normalizeTitle(p.title);
    const catSlug = p.category?.slug || 'uncategorized';
    const key = `${normTitle}|${catSlug}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  const groups: {
    key: string;
    normalizedTitle: string;
    categorySlug: string;
    canonicalId: number;
    canonicalTitle: string;
    canonicalRegion: string | null;
    derivatives: { id: number; title: string; geoRegion: string | null }[];
    count: number;
  }[] = [];
  const solo: { id: number; title: string; geoRegion: string | null; categorySlug: string }[] = [];

  for (const [key, rows] of buckets.entries()) {
    if (rows.length < 2) {
      solo.push({
        id: rows[0].id,
        title: rows[0].title,
        geoRegion: rows[0].geoRegion,
        categorySlug: rows[0].category?.slug || 'uncategorized',
      });
      continue;
    }
    const canonical = pickCanonical(rows);
    const [normalizedTitle, categorySlug] = key.split('|');
    groups.push({
      key,
      normalizedTitle,
      categorySlug,
      canonicalId: canonical.id,
      canonicalTitle: canonical.title,
      canonicalRegion: canonical.geoRegion,
      derivatives: rows
        .filter((r) => r.id !== canonical.id)
        .map((r) => ({ id: r.id, title: r.title, geoRegion: r.geoRegion })),
      count: rows.length,
    });
  }

  // 그룹 크기 내림차순
  groups.sort((a, b) => b.count - a.count);

  console.log('='.repeat(60));
  console.log(`그룹 수       : ${groups.length}`);
  console.log(`solo 정책 수  : ${solo.length}`);
  console.log(`총 원본 수    : ${groups.length + solo.length} (그룹 canonical + solo)`);
  console.log(`총 파생본 수  : ${groups.reduce((s, g) => s + g.derivatives.length, 0)}`);
  console.log('='.repeat(60));
  console.log('');

  // 상위 20 그룹
  console.log('상위 그룹 (count desc):');
  groups.slice(0, 20).forEach((g, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. [${g.count}건] ${g.normalizedTitle}  (${g.categorySlug})  canonical=id ${g.canonicalId} ${g.canonicalRegion ? '(' + g.canonicalRegion + ')' : ''}`,
    );
  });
  console.log('');

  // 저장
  const ts = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
  const outDir = path.resolve('tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `canonical-groups-${ts}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          totalPublished: all.length,
          groupCount: groups.length,
          soloCount: solo.length,
          uniqueMastersEstimate: groups.length + solo.length,
          derivativeCount: groups.reduce((s, g) => s + g.derivatives.length, 0),
        },
        groups,
        solo,
      },
      null,
      2,
    ),
  );
  console.log(`[identify-canonical] 📋 저장 → ${outPath}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
