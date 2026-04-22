/**
 * POST /api/admin/trends/news/draft
 * ------------------------------------------------------------------
 * 관리자 대시보드에서 선택한 "트렌딩 뉴스 후보"를
 * Policy DRAFT 로 생성해 기존 편집 UI 로 넘긴다.
 *
 * Body:
 *   { kind, title, description, link, pubDate, source }
 *
 * 응답:
 *   { policyId: number }  → 클라이언트가 /content/policy/:id/edit 로 리다이렉트
 *
 * 중복 방지:
 *   externalId 를 hash(link) 로 설정. 동일 link 재요청 시 기존 레코드 반환.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'admin') return null;
  return session;
}

function guessCategorySlug(title: string): string {
  if (/대출|전세자금|금리/.test(title)) return 'loan';
  if (/바우처|이용권|카드|누리/.test(title)) return 'voucher';
  if (/환급|장려금|EITC|크레딧/.test(title)) return 'refund';
  if (/보조|급여|활동지원/.test(title)) return 'grant';
  return 'subsidy';
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

/** 짧고 결정적인 external id (link 기반, 충돌 확률 극히 낮음) */
function externalIdFor(link: string): string {
  let h = 0;
  for (let i = 0; i < link.length; i++) h = ((h << 5) - h + link.charCodeAt(i)) | 0;
  return `news:${Math.abs(h).toString(36)}`;
}

type Body = {
  kind?: 'naver-news' | 'gov-rss';
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source?: string;
};

export async function POST(req: NextRequest) {
  const session = await assertAdmin();
  if (!session) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON 요청.' }, { status: 400 });
  }

  const title = (body.title || '').trim();
  const link = (body.link || '').trim();
  if (!title || !link) {
    return NextResponse.json(
      { error: 'title, link 는 필수입니다.' },
      { status: 400 },
    );
  }

  const externalId = externalIdFor(link);

  // 이미 등록된 경우 기존 ID 반환
  const existing = await prisma.policy.findUnique({
    where: { externalId },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json({
      policyId: existing.id,
      deduplicated: true,
      status: existing.status,
    });
  }

  // 카테고리 확보 (없으면 생성)
  const catSlug = guessCategorySlug(title);
  const category = await prisma.category.upsert({
    where: { slug: catSlug },
    update: {},
    create: { name: catSlugToName(catSlug), slug: catSlug },
  });

  const description = (body.description || '').trim();
  const source = body.source || (body.kind === 'gov-rss' ? '정부 보도자료' : '뉴스');

  const contentHtml = [
    `<p><em>아래 원문 뉴스/보도자료를 참고해 정책 상세 내용을 정리하세요.</em></p>`,
    description ? `<blockquote>${escapeHtml(description)}</blockquote>` : '',
    `<p>원문: <a href="${escapeAttr(link)}" target="_blank" rel="noopener nofollow">${escapeHtml(source)} → ${escapeHtml(title)}</a></p>`,
  ]
    .filter(Boolean)
    .join('\n');

  const policy = await prisma.policy.create({
    data: {
      slug: makeSlug(title),
      title: title.slice(0, 255),
      excerpt: description ? description.slice(0, 300) : null,
      content: contentHtml,
      categoryId: category.id,
      status: 'DRAFT',
      externalId,
      externalUrl: link,
      applyUrl: null,
    },
    select: { id: true },
  });

  return NextResponse.json({
    policyId: policy.id,
    deduplicated: false,
    status: 'DRAFT',
  });
}

// --- helpers ---
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
