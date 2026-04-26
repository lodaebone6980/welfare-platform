/**
 * scripts/verify-canonical-coverage.ts
 * ------------------------------------------------------------------
 * canonical 매핑이 끝난 후, "진짜 트래픽을 먹을" 정책들이
 * 실제로 본문 완성된 canonical 원본으로 커버되는지 검증.
 *
 * 주요 검증:
 *   1) D-60 이하 마감임박 정책 (95건 추정) — 모두 content 완성 canonical 에 연결돼 있는가?
 *   2) 전체 PUBLISHED 정책 880건 중 몇 %가 canonical 매핑됐는가?
 *   3) 매핑되지 않은 고아 정책 리스트 (개별 처리 필요)
 *   4) canonical 원본(55건)의 content 상태 2차 확인
 *
 * 사용:
 *   npx tsx scripts/verify-canonical-coverage.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function stripHtml(s: string): string {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 오늘 + days 이후 마감인지 판정
function dDay(deadline: string | null): number | null {
  if (!deadline) return null;
  const s = deadline.trim();
  if (!s) return null;
  // 상시/수시/연중/무기한
  if (/상시|수시|연중|무기한|별도없음|해당없음/.test(s)) return null;
  // YYYY-MM-DD 또는 YYYY.MM.DD
  const m = s.match(/(\d{4})[\-.\/]?(\d{1,2})[\-.\/]?(\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const due = new Date(Number(y), Number(mo) - 1, Number(d));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((due.getTime() - now.getTime()) / 86400000);
  return diff;
}

async function main() {
  // 전체 PUBLISHED 조회 (canonicalId 포함)
  // canonicalId 컬럼이 아직 없으면 raw SQL 로 fallback
  let published: Array<{
    id: number;
    title: string;
    slug: string;
    content: string;
    deadline: string | null;
    geoRegion: string | null;
    canonicalId: number | null;
  }>;
  try {
    published = (await prisma.$queryRawUnsafe(`
      SELECT id, title, slug, content, deadline, "geoRegion", "canonicalId"
      FROM "Policy"
      WHERE status = 'PUBLISHED'
    `)) as any;
  } catch (e) {
    console.error('❌ canonicalId 컬럼이 존재하지 않습니다. 먼저 prisma migrate 를 실행하세요.');
    console.error('   schema.prisma 에 canonicalId 필드 + @@index 추가 후');
    console.error('   npx prisma migrate dev --name add_canonical_id');
    throw e;
  }
  console.log(`[verify] 전체 PUBLISHED : ${published.length}건\n`);

  // content 완성 id set
  const okSet = new Set<number>();
  for (const p of published) {
    if (stripHtml(p.content).length >= 200) okSet.add(p.id);
  }

  // 통계
  let linkedToCanonical = 0;
  let canonicalSelf = 0;
  let unlinked = 0;
  const unlinkedList: typeof published = [];

  for (const p of published) {
    if (p.canonicalId === null) {
      // canonical 본인 또는 고아
      if (okSet.has(p.id)) canonicalSelf += 1;
      else {
        unlinked += 1;
        unlinkedList.push(p);
      }
    } else {
      linkedToCanonical += 1;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[1] 전체 매핑 현황');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  canonical 본인(OK)          : ${canonicalSelf}`);
  console.log(`  canonical 로 링크된 파생본   : ${linkedToCanonical}`);
  console.log(`  미매핑 고아 (본문도 없음)   : ${unlinked}`);
  console.log(
    `  커버율                       : ${(((canonicalSelf + linkedToCanonical) / published.length) * 100).toFixed(1)}%`,
  );

  // [2] D-60 이하 마감임박 검증
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[2] 마감임박 (D-0 ~ D-60) 커버리지');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const imminent: typeof published = [];
  for (const p of published) {
    const d = dDay(p.deadline);
    if (d !== null && d >= 0 && d <= 60) imminent.push(p);
  }
  console.log(`  D-60 이하 마감임박 : ${imminent.length}건`);

  let covered = 0;
  const uncovered: typeof published = [];
  for (const p of imminent) {
    // 자기 본문이 OK 이거나 → canonical 이 OK 면 커버
    if (okSet.has(p.id)) {
      covered += 1;
      continue;
    }
    if (p.canonicalId && okSet.has(p.canonicalId)) {
      covered += 1;
      continue;
    }
    uncovered.push(p);
  }
  console.log(`  커버됨 (본인 OK or canonical OK) : ${covered}`);
  console.log(`  미커버 (본문 생성 필요)         : ${uncovered.length}`);
  if (imminent.length > 0) {
    console.log(`  커버율                           : ${((covered / imminent.length) * 100).toFixed(1)}%`);
  }

  if (uncovered.length > 0) {
    console.log('\n⚠️  미커버 마감임박 정책 (추가 본문 생성 필요):');
    uncovered.slice(0, 30).forEach((p) => {
      const d = dDay(p.deadline);
      console.log(`   - [id=${p.id}] ${p.title}  deadline=${p.deadline} (D-${d})`);
    });
    if (uncovered.length > 30) {
      console.log(`   ... 외 ${uncovered.length - 30}건 더`);
    }
  }

  // [3] 고아 정책 샘플
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[3] 고아 정책 (canonical 미매핑 & 본문 < 200자)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  총 ${unlinkedList.length}건`);
  unlinkedList.slice(0, 10).forEach((p) => {
    console.log(`   - [id=${p.id}] ${p.title}`);
  });
  if (unlinkedList.length > 10) {
    console.log(`   ... 외 ${unlinkedList.length - 10}건 더`);
  }

  // [4] canonical 원본 상태 2차 확인
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[4] canonical 원본 본문 상태');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const canonicalIds = new Set<number>();
  for (const p of published) {
    if (p.canonicalId !== null) canonicalIds.add(p.canonicalId);
  }
  let canonOk = 0;
  let canonBroken = 0;
  const brokenCanon: number[] = [];
  for (const cid of canonicalIds) {
    if (okSet.has(cid)) canonOk += 1;
    else {
      canonBroken += 1;
      brokenCanon.push(cid);
    }
  }
  console.log(`  canonical 로 참조되는 id  : ${canonicalIds.size}`);
  console.log(`  본문 OK                 : ${canonOk}`);
  console.log(`  본문 부족 (파생본 고아화) : ${canonBroken}`);
  if (brokenCanon.length > 0) {
    console.log(`  ⚠️ 본문 부족 canonical id: ${brokenCanon.join(', ')}`);
  }

  console.log('\n[verify] 완료 ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
