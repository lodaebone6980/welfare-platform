/**
 * scripts/import-claude-content.ts
 * ------------------------------------------------------------------
 * Claude 가 직접 작성한 본문 JSON 을 DB 에 반영.
 *
 * 입력 JSON 스키마 (배열):
 *   [
 *     {
 *       "id": 123,                             // Policy.id (필수)
 *       "excerpt": "…",                        // 필수, 20~200자
 *       "content": "<h2>…</h2><p>…</p>",       // 필수, 최소 300자 HTML
 *       "eligibility": "…",                    // 필수
 *       "applicationMethod": "…",              // 필수
 *       "requiredDocuments": "…",              // 필수 (없으면 기본 안내 문구)
 *       "metaDesc": "…",                       // 필수, 160자 이내
 *       "focusKeyword": "…",                   // 필수, 2~3단어
 *       "faqs": [                              // 3~5개 권장
 *         { "question": "…", "answer": "…" }
 *       ]
 *     },
 *     …
 *   ]
 *
 * 실행 예:
 *   # 드라이런 (DB 미수정, 검증만)
 *   DRY=1 npx tsx scripts/import-claude-content.ts tmp/claude-content-2026-04-23T10-00-00.json
 *
 *   # 실제 반영
 *   npx tsx scripts/import-claude-content.ts tmp/claude-content-2026-04-23T10-00-00.json
 *
 * 안전장치:
 *   - 각 항목 검증 실패 시 skip (전체 실패 아님)
 *   - Policy.update + Faq.deleteMany + Faq.createMany 를 트랜잭션으로 원자화
 *   - HTML 위험 태그 (script/style/onXxx) 제거
 *   - 필드별 길이 상한 (Policy.content 8000자, excerpt 200자 등)
 */

import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';

const DRY = process.env.DRY === '1' || process.argv.includes('--dry');

type Item = {
  id: number;
  excerpt: string;
  content: string;
  eligibility: string;
  applicationMethod: string;
  requiredDocuments: string;
  metaDesc: string;
  focusKeyword: string;
  faqs: { question: string; answer: string }[];
};

function sanitizeHtml(s: string): string {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
}

function validate(raw: any): { ok: Item | null; error?: string } {
  if (!raw || typeof raw !== 'object') return { ok: null, error: 'not object' };
  if (typeof raw.id !== 'number') return { ok: null, error: 'id missing' };

  const required = [
    'excerpt',
    'content',
    'eligibility',
    'applicationMethod',
    'requiredDocuments',
    'metaDesc',
    'focusKeyword',
  ];
  for (const f of required) {
    if (typeof raw[f] !== 'string' || raw[f].trim().length === 0) {
      return { ok: null, error: `field ${f} empty` };
    }
  }
  if (!Array.isArray(raw.faqs)) return { ok: null, error: 'faqs not array' };

  // 길이 가드
  if (raw.content.replace(/<[^>]+>/g, '').trim().length < 300) {
    return { ok: null, error: 'content < 300자' };
  }
  if (raw.excerpt.length < 20) {
    return { ok: null, error: 'excerpt < 20자' };
  }

  const faqs = raw.faqs
    .filter(
      (f: any) =>
        f && typeof f.question === 'string' && typeof f.answer === 'string',
    )
    .slice(0, 6)
    .map((f: any) => ({
      question: String(f.question).slice(0, 200),
      answer: String(f.answer).slice(0, 800),
    }));

  return {
    ok: {
      id: raw.id,
      excerpt: String(raw.excerpt).slice(0, 200),
      content: sanitizeHtml(raw.content).slice(0, 8000),
      eligibility: String(raw.eligibility).slice(0, 2000),
      applicationMethod: String(raw.applicationMethod).slice(0, 2000),
      requiredDocuments: String(raw.requiredDocuments).slice(0, 1500),
      metaDesc: String(raw.metaDesc).slice(0, 160),
      focusKeyword: String(raw.focusKeyword).slice(0, 60),
      faqs,
    },
  };
}

async function main() {
  const filePath = process.argv.find((a) => a.endsWith('.json'));
  if (!filePath) {
    console.error('[import] 사용법: npx tsx scripts/import-claude-content.ts <path.json>');
    process.exit(1);
  }
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error(`[import] 파일 없음: ${abs}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(abs, 'utf-8'));
  if (!Array.isArray(raw)) {
    console.error('[import] JSON 최상위는 배열이어야 합니다.');
    process.exit(1);
  }

  console.log(`[import] ${abs}\n[import] 항목 수: ${raw.length} (DRY=${DRY})`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const label = `[${i + 1}/${raw.length}] id=${item?.id}`;

    const { ok, error } = validate(item);
    if (!ok) {
      console.warn(`${label} ⚠ skip: ${error}`);
      skipped++;
      continue;
    }

    // 실제 정책 존재 확인
    const exists = await prisma.policy.findUnique({
      where: { id: ok.id },
      select: { id: true, title: true, status: true },
    });
    if (!exists) {
      console.warn(`${label} ⚠ skip: Policy not found`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(
        `${label} ✓ "${exists.title.slice(0, 30)}" (content=${ok.content.length}자, faqs=${ok.faqs.length})`,
      );
      success++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.policy.update({
          where: { id: ok.id },
          data: {
            excerpt: ok.excerpt,
            content: ok.content,
            eligibility: ok.eligibility,
            applicationMethod: ok.applicationMethod,
            requiredDocuments: ok.requiredDocuments,
            metaDesc: ok.metaDesc,
            focusKeyword: ok.focusKeyword,
          },
        });

        if (ok.faqs.length > 0) {
          await tx.faq.deleteMany({ where: { policyId: ok.id } });
          await tx.faq.createMany({
            data: ok.faqs.map((f, idx) => ({
              policyId: ok.id,
              question: f.question,
              answer: f.answer,
              order: idx,
            })),
          });
        }
      });

      success++;
      console.log(`${label} ✅ saved "${exists.title.slice(0, 30)}"`);
    } catch (e) {
      failed++;
      console.error(`${label} ❌`, (e as Error).message);
    }
  }

  console.log(`[import] done. success=${success} skipped=${skipped} failed=${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
