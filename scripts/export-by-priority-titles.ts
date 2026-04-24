/**
 * scripts/export-by-priority-titles.ts
 * ------------------------------------------------------------------
 * 외부 인기 순위(복지킹·지원금24 등) 제목 리스트를 입력받아,
 * 우리 DB 의 Policy 중 해당 제목과 가장 유사한 정책부터 차례로 export.
 *
 * 입력:
 *   tmp/priority-titles.txt   (한 줄에 하나씩, 상단일수록 우선)
 *   또는 stdin (TITLES 환경변수 대신 파일 권장)
 *
 * 매칭 규칙 (상단 우선):
 *   1) title 이 완전 일치
 *   2) title 이 입력문자열을 포함 (contains)
 *   3) title 의 핵심 키워드(공백 분리 후 3자 이상) 가 절반 이상 일치
 *   4) 매칭 실패 시 unmatched 리스트에 기록 (로그만)
 *
 * 실행 예:
 *   npx tsx scripts/export-by-priority-titles.ts tmp/priority-titles.txt
 *   LIMIT=25 npx tsx scripts/export-by-priority-titles.ts tmp/priority-titles.txt
 *
 * 출력:
 *   tmp/claude-targets-<타임스탬프>.json   (우선순위 순서 그대로)
 *   tmp/unmatched-titles-<타임스탬프>.txt  (매칭 실패 — 사용자 검토용)
 */

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

const LIMIT = Math.max(1, parseInt(process.env.LIMIT || '30', 10));

/** 공백·특수문자 제거하고 소문자화 */
function norm(s: string): string {
  return s
    .replace(/\s+/g, '')
    .replace(/[·•\-_/()·\[\]【】\"'`]/g, '')
    .toLowerCase();
}

/** 핵심 키워드 추출 (3자 이상) */
function keywords(s: string): string[] {
  return s
    .split(/[\s·\-_/()\[\]【】]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

function needsGeneration(p: {
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  excerpt?: string | null;
}): boolean {
  const contentLen = (p.content || '').replace(/<[^>]+>/g, '').trim().length;
  if (contentLen < 200) return true;
  if (!p.eligibility || p.eligibility.trim().length < 20) return true;
  if (!p.applicationMethod || p.applicationMethod.trim().length < 20) return true;
  if (!p.excerpt || p.excerpt.trim().length < 20) return true;
  return false;
}

async function main() {
  const inputPath = process.argv.find((a) => a.endsWith('.txt'));
  if (!inputPath) {
    console.error('[export-priority] 사용법: npx tsx scripts/export-by-priority-titles.ts <titles.txt>');
    process.exit(1);
  }
  const abs = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(abs)) {
    console.error(`[export-priority] 파일 없음: ${abs}`);
    process.exit(1);
  }

  const priorityTitles = fs
    .readFileSync(abs, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  console.log(`[export-priority] priority titles=${priorityTitles.length}`);

  // 전체 후보 조회 (한 번에 메모리 적재 — 정책 수 ~1300 가정)
  const all = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true, slug: true, title: true, excerpt: true, description: true,
      content: true, eligibility: true, applicationMethod: true,
      requiredDocuments: true, deadline: true, applyUrl: true,
      geoRegion: true, geoDistrict: true, tags: true, viewCount: true,
      category: { select: { name: true, slug: true } },
    },
  });
  const totalPool = all.length;
  console.log(`[export-priority] DB published pool=${totalPool}`);

  // 인덱스 준비 (정규화된 title 기준)
  const byNorm = new Map<string, typeof all[number]>();
  all.forEach((p) => byNorm.set(norm(p.title), p));

  const matched: { query: string; policy: typeof all[number]; matchType: string }[] = [];
  const unmatched: string[] = [];
  const usedIds = new Set<number>();

  for (const q of priorityTitles) {
    const nq = norm(q);
    // 1) 완전 일치
    const exact = byNorm.get(nq);
    if (exact && !usedIds.has(exact.id)) {
      matched.push({ query: q, policy: exact, matchType: 'exact' });
      usedIds.add(exact.id);
      continue;
    }
    // 2) contains
    const contains = all.find(
      (p) => !usedIds.has(p.id) && (norm(p.title).includes(nq) || nq.includes(norm(p.title))),
    );
    if (contains) {
      matched.push({ query: q, policy: contains, matchType: 'contains' });
      usedIds.add(contains.id);
      continue;
    }
    // 3) 키워드 절반 이상
    const kw = keywords(q);
    if (kw.length >= 2) {
      const fuzzy = all.find((p) => {
        if (usedIds.has(p.id)) return false;
        const hit = kw.filter((w) => p.title.includes(w)).length;
        return hit >= Math.ceil(kw.length / 2);
      });
      if (fuzzy) {
        matched.push({ query: q, policy: fuzzy, matchType: 'fuzzy' });
        usedIds.add(fuzzy.id);
        continue;
      }
    }
    unmatched.push(q);
  }

  // needsGeneration 필터 — 이미 충실한 글은 재생성 불필요
  const needRegen = matched.filter((m) => needsGeneration(m.policy));
  const alreadyGood = matched.length - needRegen.length;

  // LIMIT 적용
  const targets = needRegen.slice(0, LIMIT);

  console.log(`[export-priority] matched=${matched.length} (exact/contains/fuzzy), alreadyGood=${alreadyGood}, needRegen=${needRegen.length}, export=${targets.length}, unmatched=${unmatched.length}`);

  if (targets.length === 0) {
    console.log('[export-priority] export 할 정책 없음. 리스트를 더 주시거나 LIMIT 조정.');
    await prisma.$disconnect();
    return;
  }

  const payload = targets.map((m) => {
    const p = m.policy;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      priorityQuery: m.query,
      matchType: m.matchType,
      category: p.category?.name || null,
      categorySlug: p.category?.slug || null,
      geoRegion: p.geoRegion || null,
      geoDistrict: p.geoDistrict || null,
      deadline: p.deadline || null,
      applyUrl: p.applyUrl || null,
      tags: p.tags || null,
      viewCount: p.viewCount,
      original: {
        excerpt: p.excerpt || '',
        description: p.description || '',
        content: p.content || '',
        eligibility: p.eligibility || '',
        applicationMethod: p.applicationMethod || '',
        requiredDocuments: p.requiredDocuments || '',
      },
      lengths: {
        excerpt: (p.excerpt || '').length,
        content: (p.content || '').replace(/<[^>]+>/g, '').trim().length,
        eligibility: (p.eligibility || '').length,
        applicationMethod: (p.applicationMethod || '').length,
        requiredDocuments: (p.requiredDocuments || '').length,
      },
    };
  });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `claude-targets-priority-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  if (unmatched.length > 0) {
    const unmatchedPath = path.join(outDir, `unmatched-titles-${ts}.txt`);
    fs.writeFileSync(unmatchedPath, unmatched.join('\n') + '\n', 'utf-8');
    console.log(`[export-priority] 매칭 실패 ${unmatched.length}건 → ${unmatchedPath}`);
  }

  console.log(`[export-priority] ✅ saved → ${outPath}`);
  console.log(`[export-priority] 다음 단계: Claude 에게 파일 경로 전달 → 본문 작성 → import`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
