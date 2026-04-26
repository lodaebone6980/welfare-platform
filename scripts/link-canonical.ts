/**
 * scripts/link-canonical.ts
 * ------------------------------------------------------------------
 * canonical-groups-<ts>.json 매핑 결과를 이용해 각 Policy 의 canonicalId 를 DB 에 채운다.
 *
 * 동작:
 *   1. tmp/canonical-groups-<최신>.json 을 로드 (45개 그룹, 719개 파생본)
 *   2. DB 에서 content >= 200자 (본문 완성) Policy id 집합(okSet) 확보
 *   3. 각 그룹별로 canonical 을 결정:
 *        - group.canonicalId 가 okSet 에 있으면 그대로 사용
 *        - 아니면 derivatives 중 본문 완성된 것 pick (viewCount desc → publishedAt asc → id asc)
 *        - 그래도 없으면 그 그룹은 skip (canonicalId 채우지 않음)
 *   4. 선택된 canonical 자신 → canonicalId = null (자기 자신을 참조하지 않음)
 *      나머지 파생본 → canonicalId = <선택된 canonical id>
 *
 * 사전 준비 (사용자가 직접 해야 함):
 *   1) prisma/schema.prisma 의 Policy 모델에 아래 3줄 + 인덱스 추가
 *      canonicalId       Int?
 *      canonical         Policy?   @relation("PolicyCanonical", fields: [canonicalId], references: [id], onDelete: SetNull)
 *      derivatives       Policy[]  @relation("PolicyCanonical")
 *      @@index([canonicalId])
 *   2) npx prisma migrate dev --name add_canonical_id
 *   3) npx prisma generate
 *
 * 사용:
 *   DRY=1 npx tsx scripts/link-canonical.ts       # 검증만
 *   npx tsx scripts/link-canonical.ts              # 실제 반영
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY = process.env.DRY === '1' || process.argv.includes('--dry');

function stripHtml(s: string): string {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findLatestCanonicalGroupsFile(): string {
  const tmpDir = path.join(__dirname, '..', 'tmp');
  const files = fs
    .readdirSync(tmpDir)
    .filter((f) => f.startsWith('canonical-groups-') && f.endsWith('.json'))
    .sort();
  if (files.length === 0) {
    throw new Error(
      'tmp/canonical-groups-*.json 을 찾을 수 없습니다. 먼저 scripts/identify-canonical.ts 를 실행하세요.',
    );
  }
  return path.join(tmpDir, files[files.length - 1]);
}

type GroupEntry = {
  key: string;
  normalizedTitle: string;
  categorySlug: string;
  canonicalId: number;
  canonicalTitle: string;
  canonicalRegion: string | null;
  derivatives: { id: number; title: string; geoRegion: string | null }[];
  count: number;
};

async function main() {
  const jsonPath = findLatestCanonicalGroupsFile();
  console.log(`[link-canonical] JSON: ${jsonPath}`);

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
    summary: { total: number; groups: number; solo: number };
    groups: GroupEntry[];
    solo: any[];
  };
  console.log(
    `[link-canonical] 전체 ${raw.summary.total}건 / 그룹 ${raw.summary.groups}개 / 단독 ${raw.summary.solo}개`,
  );
  console.log(`[link-canonical] DRY=${DRY}`);

  // 본문 완성 policy set (content >= 200자)
  const published = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, content: true, viewCount: true, publishedAt: true },
  });
  const okSet = new Set<number>();
  const metaById = new Map<number, { viewCount: number; publishedAt: Date | null }>();
  for (const p of published) {
    metaById.set(p.id, { viewCount: p.viewCount, publishedAt: p.publishedAt });
    if (stripHtml(p.content).length >= 200) okSet.add(p.id);
  }
  console.log(`[link-canonical] 본문 완성(OK): ${okSet.size}건\n`);

  let resolvedGroups = 0;
  let skippedGroups = 0;
  let derivUpdates = 0;
  const toCanonicalReset: number[] = []; // canonical 자기자신
  const toLink: { id: number; canonicalId: number }[] = [];
  const skippedGroupDetails: { key: string; canonicalId: number; count: number }[] = [];

  for (const g of raw.groups) {
    const allIds = [g.canonicalId, ...g.derivatives.map((d) => d.id)];

    // canonical 선택
    let chosen: number | null = null;
    if (okSet.has(g.canonicalId)) {
      chosen = g.canonicalId;
    } else {
      const okDerivs = g.derivatives
        .filter((d) => okSet.has(d.id))
        .map((d) => ({
          id: d.id,
          viewCount: metaById.get(d.id)?.viewCount || 0,
          publishedAt: metaById.get(d.id)?.publishedAt || null,
        }));
      if (okDerivs.length > 0) {
        okDerivs.sort((a, b) => {
          if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
          const ap = a.publishedAt ? a.publishedAt.getTime() : Infinity;
          const bp = b.publishedAt ? b.publishedAt.getTime() : Infinity;
          if (ap !== bp) return ap - bp;
          return a.id - b.id;
        });
        chosen = okDerivs[0].id;
      }
    }

    if (!chosen) {
      skippedGroups += 1;
      skippedGroupDetails.push({
        key: g.normalizedTitle,
        canonicalId: g.canonicalId,
        count: g.count,
      });
      continue;
    }

    resolvedGroups += 1;
    toCanonicalReset.push(chosen);
    for (const did of allIds) {
      if (did === chosen) continue;
      toLink.push({ id: did, canonicalId: chosen });
      derivUpdates += 1;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[link-canonical] resolved groups         : ${resolvedGroups}`);
  console.log(`[link-canonical] skipped groups (본문 0) : ${skippedGroups}`);
  console.log(`[link-canonical] canonical 자기자신 reset : ${toCanonicalReset.length}`);
  console.log(`[link-canonical] 파생본 canonicalId 링크  : ${derivUpdates}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (skippedGroupDetails.length > 0) {
    console.log('\n⚠️  본문 없는 그룹 (canonicalId 미할당):');
    for (const s of skippedGroupDetails) {
      console.log(`   - [id=${s.canonicalId}] ${s.key} (파생 ${s.count}건)`);
    }
  }

  if (DRY) {
    console.log('\n[DRY] 실제 업데이트 생략. 정상으로 판단되면 DRY=0 또는 flag 제거 후 재실행.');
    return;
  }

  // 실제 업데이트 — raw SQL 로 처리해 Prisma Client 타입 재생성 없이도 동작
  console.log('\n[link-canonical] 실제 업데이트 시작...');

  // 1) canonical 자기자신 → null
  for (let i = 0; i < toCanonicalReset.length; i += 100) {
    const slice = toCanonicalReset.slice(i, i + 100);
    await prisma.$executeRawUnsafe(
      `UPDATE "Policy" SET "canonicalId" = NULL WHERE id IN (${slice.join(',')})`,
    );
  }
  console.log(`   ✓ canonical 자기자신 reset: ${toCanonicalReset.length}건`);

  // 2) 파생본 링크
  const linkChunk = 200;
  let done = 0;
  for (let i = 0; i < toLink.length; i += linkChunk) {
    const slice = toLink.slice(i, i + linkChunk);
    // canonicalId 별 그루핑 해서 1 쿼리로 묶어 update
    const byCanon = new Map<number, number[]>();
    for (const { id, canonicalId } of slice) {
      if (!byCanon.has(canonicalId)) byCanon.set(canonicalId, []);
      byCanon.get(canonicalId)!.push(id);
    }
    for (const [canon, ids] of byCanon) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Policy" SET "canonicalId" = ${canon} WHERE id IN (${ids.join(',')})`,
      );
    }
    done += slice.length;
    process.stdout.write(`\r   링크 진행: ${done}/${toLink.length}`);
  }
  console.log(`\n   ✓ 파생본 링크: ${toLink.length}건`);
  console.log('\n[link-canonical] 완료 ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
