/**
 * scripts/find-orphan-policies.ts
 * ------------------------------------------------------------------
 * "고아 정책" 리스트를 export 한다 — 정의:
 *   - status = PUBLISHED
 *   - canonicalId IS NULL                     (canonical 본인 또는 그룹 밖)
 *   - 자기 자신을 가리키는 derivatives 가 없음 (= canonical 원본 아님)
 *   - content (HTML 제거 후) < 200자          (본문 없음)
 *
 * = "어떤 canonical 그룹에도 속하지 않으면서 본문도 없는 단독 정책"
 *   → 본문을 새로 써줘야 SEO 가치가 생기는 대상
 *
 * 출력:
 *   tmp/orphan-policies-<ts>.json   (id, title, category, region, deadline, applyUrl, viewCount, contentLen)
 *
 * 실행:
 *   DATABASE_URL="..." npx tsx scripts/find-orphan-policies.ts
 *   LIMIT=200 npx tsx scripts/find-orphan-policies.ts   # 상위 N건만
 *   ORDER=viewCount npx tsx scripts/find-orphan-policies.ts   # 조회수 desc 정렬
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const LIMIT = parseInt(process.env.LIMIT || '500', 10);
const ORDER = process.env.ORDER || 'viewCount'; // viewCount | id | title

function stripHtml(s: string): string {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function main() {
  console.log('[find-orphan] PUBLISHED 정책 전체 로드...');
  const published = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      eligibility: true,
      applicationMethod: true,
      geoRegion: true,
      geoDistrict: true,
      deadline: true,
      applyUrl: true,
      viewCount: true,
      tags: true,
      canonicalId: true,
      category: { select: { name: true, slug: true } },
      derivatives: { select: { id: true } },
    },
  });
  console.log(`[find-orphan] 전체 PUBLISHED: ${published.length}건`);

  // 분류
  const orphans = published.filter((p) => {
    const isDerivative = p.canonicalId !== null;          // 누군가의 파생본
    const isCanonical = p.derivatives && p.derivatives.length > 0; // 누군가가 나를 가리킴
    if (isDerivative || isCanonical) return false;
    const len = stripHtml(p.content || '').length;
    return len < 200;
  });

  console.log(`[find-orphan] 고아 (canonical 밖 + 본문 없음): ${orphans.length}건`);

  // 정렬
  orphans.sort((a, b) => {
    if (ORDER === 'viewCount') return b.viewCount - a.viewCount;
    if (ORDER === 'title') return a.title.localeCompare(b.title);
    return a.id - b.id;
  });

  const top = orphans.slice(0, LIMIT);

  const payload = top.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category?.name || null,
    categorySlug: p.category?.slug || null,
    region: p.geoRegion || null,
    district: p.geoDistrict || null,
    deadline: p.deadline || null,
    applyUrl: p.applyUrl || null,
    viewCount: p.viewCount,
    tags: p.tags || null,
    contentLen: stripHtml(p.content || '').length,
    excerptLen: (p.excerpt || '').length,
    excerpt: (p.excerpt || '').slice(0, 200),
  }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.resolve(process.cwd(), 'tmp', `orphan-policies-${ts}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`[find-orphan] ✅ saved → ${outPath}`);
  console.log(`[find-orphan] 출력 ${payload.length}건 (LIMIT=${LIMIT}, ORDER=${ORDER})`);

  // 요약
  const byCategory: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const p of payload) {
    const c = p.category || '(none)';
    const r = p.region || '(전국)';
    byCategory[c] = (byCategory[c] || 0) + 1;
    byRegion[r] = (byRegion[r] || 0) + 1;
  }
  console.log('\n[find-orphan] 카테고리 분포:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log('\n[find-orphan] 지역 분포 (상위 10):');
  Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
