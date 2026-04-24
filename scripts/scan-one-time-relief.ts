/**
 * scripts/scan-one-time-relief.ts
 *
 * 한시적(1회성) 재난·경제충격 대응 지원금 스캔
 *
 * 배경
 *  - restore-recurring.ts 는 기초연금/아동수당 등 '매년 반복 집행되는' 제도만 복원 대상으로 삼는다.
 *  - 그와 반대 성격의 '1회성·한시성' 지원금 — 예: 고유가 피해지원금, 코로나 손실보전금,
 *    집중호우 피해 재난지원금 — 는 마감일이 지나면 ARCHIVED 에 머물러야 정상이다.
 *  - 단, 이런 제도가 PUBLISHED 로 잘못 남아있거나, 반대로 상시성으로 오인되어 복원되었는지
 *    전수 점검이 필요하다.
 *
 * 동작
 *  - PUBLISHED + ARCHIVED 전체를 스캔
 *  - ONE_TIME_KEYWORDS 에 하나라도 걸리면 분류
 *  - status / deadline / 키워드별 분포 덤프
 *  - 위험 케이스(PUBLISHED + 과거마감, ARCHIVED 중 deadline=상시) 는 별도 표시
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 한시적·1회성 지원 키워드
 *  - 재난/재해 대응: 재난지원금, 피해지원금, 특별재난, 집중호우, 태풍, 폭염, 한파, 산불, 지진, 조류인플루엔자
 *  - 경제 충격 대응: 고유가, 에너지바우처(이건 상시일 수 있음 — 별도 체크), 소상공인 손실보전, 방역지원금, 코로나, 팬데믹
 *  - 일시 성격 어휘: 한시, 일회성, 긴급지원금(긴급복지는 상시라 제외), 특별지원금, 위기가구 긴급생계
 */
const ONE_TIME_KEYWORDS = [
  // 재난/재해
  '재난지원금',
  '재난 지원금',
  '피해지원',
  '피해 지원',
  '특별재난',
  '집중호우',
  '태풍',
  '폭염',
  '한파',
  '산불',
  '지진',
  '조류인플루엔자',
  'AI 피해',
  '수해',
  // 경제 충격
  '고유가',
  '유가 대응',
  '손실보전',
  '손실 보전',
  '방역지원',
  '방역 지원',
  '코로나',
  '팬데믹',
  '소비쿠폰',
  '소비 쿠폰',
  '온누리상품권 특별',
  '민생회복',
  '민생 회복',
  // 일시/한시 어휘
  '한시지원',
  '한시 지원',
  '일회성',
  '1회성',
  '특별지원금',
  '특별 지원금',
  '위기가구 긴급생계',
];

/** 정확한 매칭을 위해 '긴급복지'처럼 상시성 제도는 ONE_TIME 에서 제외해야 함 */
const EXCLUDE_PHRASES = ['긴급복지', '긴급 복지'];

function hitKeyword(text: string): string | null {
  const lowered = text;
  for (const ex of EXCLUDE_PHRASES) {
    if (lowered.includes(ex)) return null;
  }
  for (const k of ONE_TIME_KEYWORDS) {
    if (lowered.includes(k)) return k;
  }
  return null;
}

const ALWAYS_REGEX = /(상시|수시|연중|무기한|별도없음|해당없음)/;

function parseDeadline(s: string | null | undefined): Date | 'always' | null {
  if (!s) return 'always';
  if (ALWAYS_REGEX.test(s)) return 'always';
  const m = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d, 23, 59, 59);
  return isNaN(dt.getTime()) ? null : dt;
}

async function main() {
  const all = await prisma.policy.findMany({
    where: { status: { in: ['PUBLISHED', 'ARCHIVED'] } },
    select: {
      id: true,
      title: true,
      status: true,
      deadline: true,
      geoRegion: true,
      categorySlug: true,
      excerpt: true,
    },
  });

  const now = new Date();
  const hits: Array<{
    id: number;
    title: string;
    status: string;
    deadline: string | null;
    region: string | null;
    category: string;
    keyword: string;
    flag: string; // 'OK-expected' | 'WARN-stale' | 'WARN-published-expired' | 'WARN-restored-always'
  }> = [];

  const kwCount: Record<string, number> = {};
  const byStatus: Record<string, number> = { PUBLISHED: 0, ARCHIVED: 0 };

  for (const p of all) {
    const haystack = `${p.title} ${p.excerpt ?? ''}`;
    const k = hitKeyword(haystack);
    if (!k) continue;

    kwCount[k] = (kwCount[k] ?? 0) + 1;
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

    const parsed = parseDeadline(p.deadline);
    let flag = 'OK-expected';
    if (p.status === 'PUBLISHED' && parsed instanceof Date && parsed < now) {
      flag = 'WARN-published-expired';
    } else if (p.status === 'PUBLISHED' && parsed === 'always') {
      // 1회성 제도가 deadline=상시로 떠있는 건 위험 — restore-recurring 이 잘못 복원했을 가능성
      flag = 'WARN-restored-always';
    } else if (p.status === 'ARCHIVED') {
      flag = 'OK-archived';
    }

    hits.push({
      id: p.id,
      title: p.title,
      status: p.status,
      deadline: p.deadline ?? null,
      region: p.geoRegion ?? null,
      category: p.categorySlug,
      keyword: k,
      flag,
    });
  }

  console.log('');
  console.log('='.repeat(70));
  console.log(`한시적(1회성) 지원 매칭 결과 : ${hits.length} 건`);
  console.log(`  PUBLISHED : ${byStatus.PUBLISHED ?? 0}`);
  console.log(`  ARCHIVED  : ${byStatus.ARCHIVED ?? 0}`);
  console.log('='.repeat(70));

  console.log('\n키워드별 분포:');
  Object.entries(kwCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, c]) => {
      console.log(`  ${k.padEnd(20)} ${String(c).padStart(4)}`);
    });

  const warnRestored = hits.filter((h) => h.flag === 'WARN-restored-always');
  const warnExpired = hits.filter((h) => h.flag === 'WARN-published-expired');
  const archived = hits.filter((h) => h.status === 'ARCHIVED');
  const publishedOk = hits.filter(
    (h) => h.status === 'PUBLISHED' && !h.flag.startsWith('WARN')
  );

  if (warnRestored.length) {
    console.log('\n⚠️  WARN — 1회성인데 deadline=상시로 복원됨 (수동 검토 권장):');
    for (const h of warnRestored.slice(0, 30)) {
      console.log(
        `  [${h.id}] ${h.title}  [${h.region ?? '-'}] ← keyword=${h.keyword} / deadline=${h.deadline}`
      );
    }
    if (warnRestored.length > 30) console.log(`  ... 외 ${warnRestored.length - 30}건`);
  }

  if (warnExpired.length) {
    console.log('\n⚠️  WARN — PUBLISHED 상태인데 마감일이 이미 지남:');
    for (const h of warnExpired.slice(0, 30)) {
      console.log(
        `  [${h.id}] ${h.title}  [${h.region ?? '-'}] ← deadline=${h.deadline}`
      );
    }
    if (warnExpired.length > 30) console.log(`  ... 외 ${warnExpired.length - 30}건`);
  }

  console.log(`\nPUBLISHED 상태로 유효한 1회성 지원 샘플 (${publishedOk.length}건 중 최대 15):`);
  for (const h of publishedOk.slice(0, 15)) {
    console.log(`  [${h.id}] ${h.title}  [${h.region ?? '-'}] deadline=${h.deadline}`);
  }

  console.log(`\nARCHIVED 상태(정상 — 지난 1회성 제도) 샘플 (${archived.length}건 중 최대 15):`);
  for (const h of archived.slice(0, 15)) {
    console.log(`  [${h.id}] ${h.title}  [${h.region ?? '-'}] deadline=${h.deadline}`);
  }

  // JSON 저장
  const fs = await import('fs');
  const path = await import('path');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join('tmp', `one-time-relief-${ts}.json`);
  fs.mkdirSync('tmp', { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          total: hits.length,
          published: byStatus.PUBLISHED ?? 0,
          archived: byStatus.ARCHIVED ?? 0,
          warnRestoredAlways: warnRestored.length,
          warnPublishedExpired: warnExpired.length,
        },
        keywordDistribution: kwCount,
        hits,
      },
      null,
      2
    )
  );
  console.log(`\n[scan-one-time-relief] 📋 저장 → ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
