/**
 * scripts/enrich-all-policies.ts
 * ------------------------------------------------------------------
 * API(복지로/공공데이터포털/네이버뉴스)로 수집된 모든 정책에 대해
 * 누락된 표시 정보를 자동 채워넣는 배치 스크립트.
 *
 * 채우는 필드:
 *   - excerpt          : 없으면 description/content 앞 80자 요약
 *   - metaDesc         : 없으면 excerpt + 카테고리 태그
 *   - focusKeyword     : 없으면 cleanTitle 결과에서 주 키워드 추출
 *   - title            : cleanTitle 결과와 다르면 업데이트 (노이즈 제거)
 *
 * 건드리지 않는 필드:
 *   - deadline / eligibility / applicationMethod / content
 *     (원문 보존 — LLM 기반 보강은 별도 단계로)
 *
 * 실행:
 *   npx tsx scripts/enrich-all-policies.ts
 *   DRY=1 npx tsx scripts/enrich-all-policies.ts    # DB 업데이트 없이 로그만
 */

import { prisma } from '../lib/prisma';
import { cleanTitle, extractBenefitSummary, oneLineSummary } from '../lib/policy-display';

const DRY = process.env.DRY === '1' || process.argv.includes('--dry');

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentence(s: string, maxLen = 80): string {
  if (!s) return '';
  const t = stripHtml(s);
  if (!t) return '';
  const sentence = t.split(/[\.。]\s|\n/)[0];
  return sentence.length > maxLen ? sentence.slice(0, maxLen) + '…' : sentence;
}

function pickFocusKeyword(title: string): string {
  const clean = cleanTitle(title);
  if (!clean) return '';
  const tokens = clean.split(/\s+/).filter((w) => w.length >= 2);
  if (tokens.length === 0) return clean.slice(0, 20);
  // "청년 월세지원" 같은 2단어 조합 우선
  if (tokens.length >= 2) return tokens.slice(0, 2).join(' ');
  return tokens[0];
}

async function main() {
  const total = await prisma.policy.count();
  console.log(`[enrich] total policies = ${total} (DRY=${DRY})`);

  const BATCH = 200;
  let skip = 0;
  let touched = 0;
  let checked = 0;

  while (skip < total) {
    const rows = await prisma.policy.findMany({
      skip,
      take: BATCH,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        title: true,
        excerpt: true,
        metaDesc: true,
        focusKeyword: true,
        description: true,
        content: true,
        category: { select: { name: true } },
      },
    });
    if (rows.length === 0) break;

    for (const p of rows) {
      checked++;
      const updates: Record<string, any> = {};

      // 1) title 노이즈 제거 (원본 != cleaned)
      const cleaned = cleanTitle(p.title);
      if (cleaned && cleaned !== p.title && cleaned.length >= 4) {
        updates.title = cleaned;
      }

      // 2) excerpt — description/content 앞 80자
      if (!p.excerpt || p.excerpt.trim().length < 10) {
        const summary =
          oneLineSummary({
            excerpt: null,
            description: p.description,
            content: p.content,
          }) ||
          firstSentence(p.description || p.content, 80);
        if (summary) updates.excerpt = summary;
      }

      // 3) metaDesc — SEO용 160자 이하
      if (!p.metaDesc || p.metaDesc.trim().length < 20) {
        const base = updates.excerpt || p.excerpt || firstSentence(p.content, 150);
        if (base) {
          const cat = p.category?.name ? `[${p.category.name}] ` : '';
          updates.metaDesc = (cat + base).slice(0, 155);
        }
      }

      // 4) focusKeyword
      if (!p.focusKeyword || p.focusKeyword.trim().length < 2) {
        const kw = pickFocusKeyword(p.title);
        if (kw) updates.focusKeyword = kw;
      }

      if (Object.keys(updates).length === 0) continue;
      touched++;

      if (DRY) {
        console.log(
          `[dry] #${p.id} ${p.title.slice(0, 30)} -> ${JSON.stringify(updates).slice(0, 120)}`,
        );
      } else {
        try {
          await prisma.policy.update({ where: { id: p.id }, data: updates });
        } catch (err) {
          console.warn(`[enrich] update fail #${p.id}:`, (err as Error).message);
        }
      }
    }

    skip += rows.length;
    if (checked % 1000 === 0) {
      console.log(`[enrich] progress ${checked}/${total} touched=${touched}`);
    }
  }

  console.log(`[enrich] done. checked=${checked} touched=${touched} DRY=${DRY}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
