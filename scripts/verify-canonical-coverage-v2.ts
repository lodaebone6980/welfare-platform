/**
 * scripts/verify-canonical-coverage-v2.ts
 * ------------------------------------------------------------------
 * v1 의 dDay 파싱 버그 수정판.
 * "2026년 6월 15일", "2026.06.15", "20260615" 등 다양한 한국식 날짜 포맷을
 * 모두 인식하도록 개선.
 *
 * 사용:
 *   npx tsx scripts/verify-canonical-coverage-v2.ts
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

function computeDDay(y: number, mo: number, d: number): number {
  const due = new Date(y, mo - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - now.getTime()) / 86400000);
}

// "2026년 6월 15일" / "2026-06-15" / "2026.06.15" / "2026/06/15" / "20260615" 모두 지원
function dDay(deadline: string | null): number | null {
  if (!deadline) return null;
  const s = String(deadline).trim();
  if (!s) return null;
  if (/상시|수시|연중|무기한|별도없음|해당없음|별도|추후|없음|미정/.test(s)) return null;

  // 1) 숫자만 3개 이상 등장하는 경우 (YYYY MM DD 순서라고 가정)
  const nums = s.match(/\d+/g);
  if (nums && nums.length >= 3) {
    const y = parseInt(nums[0], 10);
    const mo = parseInt(nums[1], 10);
    const d = parseInt(nums[2], 10);
    if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return computeDDay(y, mo, d);
    }
  }

  // 2) 8자리 한 덩어리 (20260615)
  const block = s.match(/(\d{8})/);
  if (block) {
    const y = parseInt(block[1].slice(0, 4), 10);
    const mo = parseInt(block[1].slice(4, 6), 10);
    const d = parseInt(block[1].slice(6, 8), 10);
    if (y >= 1900 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return computeDDay(y, mo, d);
    }
  }

  return null;
}

async function main() {
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
    console.error('❌ canonicalId 컬럼 없음. prisma db push 먼저 실행하세요.');
    throw e;
  }
  console.log(`[verify-v2] 전체 PUBLISHED : ${published.length}건\n`);

  const okSet = new Set<number>();
  for (const p of published) {
    if (stripHtml(p.content).length >= 200) okSet.add(p.id);
  }

  // [1] 전체 매핑 현황
  let linkedToCanonical = 0;
  let canonicalSelf = 0;
  let unlinked = 0;
  const unlinkedList: typeof published = [];
  for (const p of published) {
    if (p.canonicalId === null) {
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

  // [2] 마감임박 D-0~D-60
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[2] 마감임박 (D-0 ~ D-60) 커버리지');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 디버그 카운트
  const deadlineStats = { total: 0, always: 0, parsed: 0, unparsed: 0, past: 0, future: 0 };
  const imminent: typeof published = [];
  for (const p of published) {
    deadlineStats.total += 1;
    if (!p.deadline || !p.deadline.trim()) {
      deadlineStats.always += 1;
      continue;
    }
    if (/상시|수시|연중|무기한|별도없음|해당없음|별도|추후|없음|미정/.test(p.deadline)) {
      deadlineStats.always += 1;
      continue;
    }
    const d = dDay(p.deadline);
    if (d === null) {
      deadlineStats.unparsed += 1;
      continue;
    }
    deadlineStats.parsed += 1;
    if (d < 0) deadlineStats.past += 1;
    else deadlineStats.future += 1;
    if (d >= 0 && d <= 60) imminent.push(p);
  }

  console.log(`  deadline 분포 — 상시 ${deadlineStats.always} / 파싱 ${deadlineStats.parsed} / 파싱실패 ${deadlineStats.unparsed}`);
  console.log(`  → 과거 ${deadlineStats.past} / 미래 ${deadlineStats.future}`);
  console.log(`  D-60 이하 마감임박 : ${imminent.length}건`);

  let covered = 0;
  const uncovered: typeof published = [];
  for (const p of imminent) {
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
      console.log(`   - [id=${p.id}] ${p.title}  deadline="${p.deadline}" (D-${d})`);
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
    console.log(`   - [id=${p.id}] ${p.title}  deadline="${p.deadline || '-'}"`);
  });
  if (unlinkedList.length > 10) {
    console.log(`   ... 외 ${unlinkedList.length - 10}건 더`);
  }

  // [4] canonical 원본 상태
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

  console.log('\n[verify-v2] 완료 ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
