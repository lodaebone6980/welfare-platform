/**
 * Vercel Cron: /api/cron/collect-news
 * ------------------------------------------------------------------
 * 매일 오전에 네이버 뉴스 + 부처 RSS 를 수집해
 * "강한 신호" (키워드/길이/날짜) 기사에 한해 Policy DRAFT 로 자동 등록한다.
 *
 * 인증:
 *   - Vercel Cron → x-vercel-cron 헤더
 *   - 수동 호출 → Authorization: Bearer ${CRON_SECRET}
 *
 * 중복 등록 방지:
 *   externalId = hash(link). 동일 기사는 skip.
 *
 * 노이즈 방지 (자동 등록 기준):
 *   - STRONG_KEYWORDS 중 하나 이상 title 포함
 *   - 72시간 이내 게시된 뉴스
 *   - title 길이 10 ~ 120
 *
 * 기준 미달 기사는 관리자 대시보드 (/trending-news) 에서 수동 검토 대상으로만 남김.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { collectTrendingSupportNews, stripHtml } from '@/lib/collectors/naver-news';
import { collectGovNews } from '@/lib/collectors/gov-rss';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 자동 등록을 허용할 "강한" 복지/지원금 키워드
const STRONG_KEYWORDS = [
  '긴급지원',
  '피해지원',
  '피해보상',
  '재난지원금',
  '바우처',
  '환급금',
  '장려금',
  '유가 피해',
  '특별지원',
  '돌봄수당',
  '양육수당',
  '출산지원금',
  '청년지원',
  '청년수당',
  '전세자금',
];

const AUTO_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72시간
const AUTO_TITLE_MIN = 10;
const AUTO_TITLE_MAX = 120;
const AUTO_HARD_LIMIT = 15; // 한 번 Cron 실행당 최대 신규 draft 개수

function hasStrongKeyword(title: string, description: string): boolean {
  const haystack = `${title} ${description}`;
  return STRONG_KEYWORDS.some((kw) => haystack.includes(kw));
}

function externalIdFor(link: string): string {
  let h = 0;
  for (let i = 0; i < link.length; i++) h = ((h << 5) - h + link.charCodeAt(i)) | 0;
  return `news:${Math.abs(h).toString(36)}`;
}

function guessCategorySlug(title: string): string {
  if (/대출|전세자금|금리/.test(title)) return 'loan';
  if (/바우처|이용권|카드|누리/.test(title)) return 'voucher';
  if (/환급|장려금|EITC|크레딧/.test(title)) return 'refund';
  if (/보조|급여|활동지원/.test(title)) return 'grant';
  return 'subsidy';
}

function catSlugToName(slug: string): string {
  switch (slug) {
    case 'loan': return '대출';
    case 'voucher': return '바우처';
    case 'refund': return '환급금';
    case 'grant': return '보조금';
    case 'subsidy':
    default: return '지원금';
  }
}

function makeSlug(title: string): string {
  const base =
    title
      .replace(/[^\w가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 50) || 'policy';
  return `${base}-${nanoid(6)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: Request) {
  // --- auth (Vercel Cron 또는 수동 CRON_SECRET) ---
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  const vercelCron = req.headers.get('x-vercel-cron');
  if (!vercelCron && secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  // --- 수집 ---
  const [naverRaw, govRaw] = await Promise.all([
    collectTrendingSupportNews(
      ['지원금', '보조금', '재난지원', '피해지원', '바우처', '환급금'],
      30,
    ).catch((e) => {
      console.warn('[cron/collect-news] naver failed:', e?.message);
      return [];
    }),
    collectGovNews().catch((e) => {
      console.warn('[cron/collect-news] gov-rss failed:', e?.message);
      return [];
    }),
  ]);

  type Item = {
    kind: 'naver-news' | 'gov-rss';
    title: string;
    description: string;
    link: string;
    pubDate: string;
    source: string;
  };

  const naverItems: Item[] = naverRaw.map((it) => ({
    kind: 'naver-news',
    title: stripHtml(it.title),
    description: stripHtml(it.description),
    link: it.originallink || it.link,
    pubDate: it.pubDate,
    source: 'Naver News',
  }));

  const govItems: Item[] = govRaw.map((it) => ({
    kind: 'gov-rss',
    title: it.title,
    description: it.description,
    link: it.link,
    pubDate: it.pubDate,
    source: it.source,
  }));

  const merged: Item[] = [...govItems, ...naverItems];

  // --- 엄격한 자동 등록 필터 ---
  const now = Date.now();
  const candidates = merged.filter((it) => {
    if (!it.title || !it.link) return false;
    if (it.title.length < AUTO_TITLE_MIN || it.title.length > AUTO_TITLE_MAX) return false;
    const t = new Date(it.pubDate).getTime();
    if (isNaN(t)) return false;
    if (now - t > AUTO_MAX_AGE_MS) return false;
    if (!hasStrongKeyword(it.title, it.description || '')) return false;
    return true;
  });

  // 최신순 정렬 후 AUTO_HARD_LIMIT 만큼
  candidates.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );
  const toProcess = candidates.slice(0, AUTO_HARD_LIMIT);

  let created = 0;
  let deduped = 0;
  const errors: { link: string; error: string }[] = [];

  for (const it of toProcess) {
    try {
      const externalId = externalIdFor(it.link);

      const existing = await prisma.policy.findUnique({
        where: { externalId },
        select: { id: true },
      });
      if (existing) {
        deduped++;
        continue;
      }

      const catSlug = guessCategorySlug(it.title);
      const category = await prisma.category.upsert({
        where: { slug: catSlug },
        update: {},
        create: { name: catSlugToName(catSlug), slug: catSlug },
      });

      const contentHtml = [
        `<p><em>[자동 수집] 아래 원문을 참고해 정책 내용을 보강한 뒤 PUBLISHED 로 전환하세요.</em></p>`,
        it.description
          ? `<blockquote>${escapeHtml(it.description)}</blockquote>`
          : '',
        `<p>원문: <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener nofollow">${escapeHtml(it.source)} → ${escapeHtml(it.title)}</a></p>`,
      ]
        .filter(Boolean)
        .join('\n');

      await prisma.policy.create({
        data: {
          slug: makeSlug(it.title),
          title: it.title.slice(0, 255),
          excerpt: it.description ? it.description.slice(0, 300) : null,
          content: contentHtml,
          categoryId: category.id,
          status: 'DRAFT',
          externalId,
          externalUrl: it.link,
          applyUrl: null,
        },
      });
      created++;
    } catch (err) {
      errors.push({
        link: it.link,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    collected: { total: merged.length, naver: naverItems.length, gov: govItems.length },
    autoEligible: candidates.length,
    processed: toProcess.length,
    created,
    deduped,
    errorCount: errors.length,
    errors: errors.slice(0, 10),
  });
}
