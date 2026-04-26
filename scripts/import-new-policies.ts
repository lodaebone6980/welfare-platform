/**
 * scripts/import-new-policies.ts
 * ------------------------------------------------------------------
 * Claude 가 작성한 "신규 정책" JSON 을 DB 에 새로 INSERT.
 *
 * 입력 JSON 스키마 (배열):
 *   [
 *     {
 *       "title": "근로장려금",                  // 필수, 중복 시 skip
 *       "slug": "근로장려금-eitc",              // 옵션, 없으면 title 기반 자동생성 (+ nanoid)
 *       "categorySlug": "refund",               // 필수: subsidy/grant/voucher/refund/loan/education/employment/medical/culture/housing
 *       "geoRegion": null,                      // 옵션 (전국이면 null, 지역이면 "서울" 등)
 *       "deadline": "상시모집",                 // 옵션
 *       "applyUrl": "https://...",              // 옵션
 *       "tags": "환급금,근로,장려금",           // 옵션
 *       "excerpt": "…",                         // 필수, 20~200자
 *       "content": "<h2>…</h2><p>…</p>",        // 필수, ≥300자 (HTML 제거 후)
 *       "eligibility": "…",                     // 필수
 *       "applicationMethod": "…",               // 필수
 *       "requiredDocuments": "…",               // 필수
 *       "metaDesc": "…",                        // 필수, ≤160자
 *       "focusKeyword": "…",                    // 필수
 *       "faqs": [{ "question": "…", "answer": "…" }]
 *     }
 *   ]
 *
 * 실행:
 *   DRY=1 npx tsx scripts/import-new-policies.ts tmp/new-policies-batch1.json   # 검증만
 *   npx tsx scripts/import-new-policies.ts tmp/new-policies-batch1.json          # 실제 INSERT
 *
 * 안전장치:
 *   - 동일 title 이 이미 PUBLISHED 로 존재 시 skip
 *   - status=PUBLISHED, publishedAt=now() 로 즉시 공개
 *   - HTML 위험 태그 (script/style/onXxx) 제거
 *   - Faq 함께 트랜잭션으로 원자화
 */
import { PrismaClient, PolicyStatus } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY = process.env.DRY === '1' || process.argv.includes('--dry');

type NewItem = {
  title: string;
  slug?: string;
  categorySlug: string;
  geoRegion?: string | null;
  geoDistrict?: string | null;
  deadline?: string | null;
  applyUrl?: string | null;
  tags?: string | null;
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

function makeSlug(title: string): string {
  const base = title
    .replace(/[^\w가-힣\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return `${base}-${nanoid(6)}`;
}

function validate(raw: any): { ok: NewItem | null; error?: string } {
  if (!raw || typeof raw !== 'object') return { ok: null, error: 'not object' };
  const required = ['title', 'categorySlug', 'excerpt', 'content', 'eligibility', 'applicationMethod', 'requiredDocuments', 'metaDesc', 'focusKeyword'];
  for (const f of required) {
    if (typeof raw[f] !== 'string' || raw[f].trim().length === 0) return { ok: null, error: `field ${f} empty` };
  }
  if (!Array.isArray(raw.faqs)) return { ok: null, error: 'faqs not array' };
  if (raw.content.replace(/<[^>]+>/g, '').trim().length < 300) return { ok: null, error: 'content < 300자' };
  if (raw.excerpt.length < 20) return { ok: null, error: 'excerpt < 20자' };

  const faqs = raw.faqs
    .filter((f: any) => f && typeof f.question === 'string' && typeof f.answer === 'string')
    .slice(0, 6)
    .map((f: any) => ({ question: String(f.question).slice(0, 200), answer: String(f.answer).slice(0, 800) }));

  return {
    ok: {
      title: String(raw.title).trim().slice(0, 200),
      slug: raw.slug ? String(raw.slug) : undefined,
      categorySlug: String(raw.categorySlug),
      geoRegion: raw.geoRegion ?? null,
      geoDistrict: raw.geoDistrict ?? null,
      deadline: raw.deadline ?? null,
      applyUrl: raw.applyUrl ?? null,
      tags: raw.tags ?? null,
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
    console.error('[import-new] 사용법: npx tsx scripts/import-new-policies.ts <path.json>');
    process.exit(1);
  }
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) { console.error(`[import-new] 파일 없음: ${abs}`); process.exit(1); }

  const raw = JSON.parse(fs.readFileSync(abs, 'utf-8'));
  if (!Array.isArray(raw)) { console.error('[import-new] JSON 최상위는 배열이어야 합니다.'); process.exit(1); }

  console.log(`[import-new] ${abs}\n[import-new] 항목 수: ${raw.length} (DRY=${DRY})`);

  // 카테고리 미리 로드
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  console.log(`[import-new] 카테고리 ${categories.length}개 로드`);

  let inserted = 0, skipped = 0, failed = 0;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const label = `[${i + 1}/${raw.length}] "${(item?.title || '').slice(0, 30)}"`;

    const { ok, error } = validate(item);
    if (!ok) { console.warn(`${label} ⚠ skip: ${error}`); skipped++; continue; }

    const cat = catBySlug.get(ok.categorySlug);
    if (!cat) { console.warn(`${label} ⚠ skip: categorySlug "${ok.categorySlug}" 없음`); skipped++; continue; }

    // 동일 title 중복 체크
    const dup = await prisma.policy.findFirst({
      where: { title: ok.title, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (dup) { console.warn(`${label} ⚠ skip: 동일 title 이미 존재 (id=${dup.id})`); skipped++; continue; }

    if (DRY) {
      console.log(`${label} ✓ DRY (category=${cat.name}, content=${ok.content.length}자, faqs=${ok.faqs.length})`);
      inserted++;
      continue;
    }

    try {
      const slug = ok.slug || makeSlug(ok.title);
      await prisma.$transaction(async (tx) => {
        const created = await tx.policy.create({
          data: {
            slug,
            title: ok.title,
            content: ok.content,
            excerpt: ok.excerpt,
            eligibility: ok.eligibility,
            applicationMethod: ok.applicationMethod,
            requiredDocuments: ok.requiredDocuments,
            metaDesc: ok.metaDesc,
            focusKeyword: ok.focusKeyword,
            deadline: ok.deadline,
            applyUrl: ok.applyUrl,
            tags: ok.tags,
            geoRegion: ok.geoRegion,
            geoDistrict: ok.geoDistrict,
            categoryId: cat.id,
            status: PolicyStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });
        if (ok.faqs.length > 0) {
          await tx.faq.createMany({
            data: ok.faqs.map((f, idx) => ({
              policyId: created.id,
              question: f.question,
              answer: f.answer,
              order: idx,
            })),
          });
        }
      });
      inserted++;
      console.log(`${label} ✅ inserted`);
    } catch (e) {
      failed++;
      console.error(`${label} ❌`, (e as Error).message);
    }
  }

  console.log(`\n[import-new] done. inserted=${inserted} skipped=${skipped} failed=${failed}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
