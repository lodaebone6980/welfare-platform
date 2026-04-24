/**
 * scripts/extract-canonical-todo.ts
 *
 * canonical-groups-<ts>.json 을 읽어서
 *  - 이미 본문 작성 완료된 canonical(batch1+batch2) 는 DONE 으로 표시
 *  - 남은 canonical 을 본문 작성 대기 목록으로 출력
 *
 * 사용
 *   npx tsx scripts/extract-canonical-todo.ts                # 최신 canonical-groups-*.json 자동 선택
 *   npx tsx scripts/extract-canonical-todo.ts tmp/canonical-groups-....json
 */

import * as fs from 'fs';
import * as path from 'path';

// batch1 + batch2 에서 본문 작성을 마친 canonical ids
const DONE_IDS = new Set<number>([
  // batch1 (11건)
  1352, 1873, 1903, 1536, 40, 428, 991, 470, 185, 286, 120,
  // batch2 (14건)
  49, 172, 1, 93, 85, 1042, 2, 1899, 1309, 2426, 1023, 2183, 1951, 7,
]);

function pickLatest(): string {
  const dir = 'tmp';
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('canonical-groups-') && f.endsWith('.json'))
    .map((f) => path.join(dir, f));
  if (!files.length) {
    console.error('tmp/canonical-groups-*.json 이 없습니다. 먼저 identify-canonical.ts 를 실행하세요.');
    process.exit(1);
  }
  files.sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  );
  return files[0];
}

function main() {
  const file = process.argv[2] ?? pickLatest();
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const groups: Array<{
    normalizedTitle: string;
    canonicalId: number;
    canonicalTitle: string;
    canonicalRegion: string;
    categorySlug: string;
    count: number;
  }> = json.groups;

  const total = groups.length;
  const done = groups.filter((g) => DONE_IDS.has(g.canonicalId));
  const todo = groups.filter((g) => !DONE_IDS.has(g.canonicalId));

  console.log('');
  console.log('='.repeat(70));
  console.log(`canonical 그룹 총 ${total}  |  완료 ${done.length}  |  남은 ${todo.length}`);
  console.log('='.repeat(70));

  console.log('\n✅ 완료된 canonical:');
  done
    .sort((a, b) => b.count - a.count)
    .forEach((g, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)}. [${String(g.count).padStart(2)}건] ${g.normalizedTitle.padEnd(18)} (${g.categorySlug}) canonical=${g.canonicalId}`
      );
    });

  console.log('\n📝 남은 canonical (본문 작성 대상):');
  todo
    .sort((a, b) => b.count - a.count)
    .forEach((g, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)}. [${String(g.count).padStart(2)}건] ${g.normalizedTitle.padEnd(18)} (${g.categorySlug}) canonical=${g.canonicalId} ${g.canonicalRegion}`
      );
    });

  // JSON 으로도 덤프 (Claude 본문 작성 입력용)
  const outPath = 'tmp/canonical-todo.json';
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        sourceFile: file,
        summary: { total, done: done.length, todo: todo.length },
        doneIds: [...DONE_IDS],
        todo: todo.map((g) => ({
          id: g.canonicalId,
          title: g.canonicalTitle,
          normalized: g.normalizedTitle,
          category: g.categorySlug,
          region: g.canonicalRegion,
          count: g.count,
        })),
      },
      null,
      2
    )
  );
  console.log(`\n[extract-canonical-todo] 📋 저장 → ${outPath}`);
}

main();
