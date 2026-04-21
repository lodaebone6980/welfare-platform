/**
 * 새 라우트: /[category]/[slug] — 정책 상세
 * ------------------------------------------------------------------
 * 파일 위치: app/(public)/[category]/[slug]/page.tsx
 *
 * 기존 app/(public)/welfare/[slug]/page.tsx 를 이 파일로 이동.
 * 카테고리 유효성을 category_guard.ts 로 검사하고,
 * category와 policy.category가 불일치하면 올바른 경로로 301 redirect.
 */

import { notFound, redirect, permanentRedirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { isValidCategory, ALL_CATEGORIES } from './category_guard';
import type { Metadata } from 'next';

interface PageProps {
  params: { category: string; slug: string };
}

export async function generateStaticParams() {
  const policies = await prisma.policy.findMany({
    where: { published: true },
    select: { slug: true, category: true },
  });
  return policies
    .filter((p) => isValidCategory(p.category))
    .map((p) => ({ category: p.category!, slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const policy = await prisma.policy.findUnique({
    where: { slug: params.slug },
    select: { title: true, seoTitle: true, seoDescription: true, aiSummary: true },
  });
  if (!policy) return {};
  return {
    title: policy.seoTitle ?? policy.title,
    description: policy.seoDescription ?? policy.aiSummary ?? undefined,
    alternates: { canonical: `/${params.category}/${params.slug}` },
  };
}

export default async function PolicyPage({ params }: PageProps) {
  // 1) 카테고리 유효성
  if (!isValidCategory(params.category)) notFound();

  // 2) DB 조회
  const policy = await prisma.policy.findUnique({
    where: { slug: params.slug },
    include: { category: false },
  });
  if (!policy || !policy.published) notFound();

  // 3) URL category와 DB category 불일치 → 올바른 경로로 301
  if (policy.category && policy.category !== params.category) {
    permanentRedirect(`/${policy.category}/${policy.slug}`);
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <a href="/" className="hover:underline">홈</a>
        <span className="mx-1">/</span>
        <a href={`/${params.category}`} className="hover:underline">
          {CATEGORY_LABELS[params.category] ?? params.category}
        </a>
        <span className="mx-1">/</span>
        <span>{policy.title}</span>
      </nav>

      <h1 className="text-2xl font-bold leading-snug">{policy.title}</h1>
      {policy.aiSummary && (
        <p className="mt-3 rounded-lg bg-orange-50 px-4 py-3 text-sm text-gray-800">
          {policy.aiSummary}
        </p>
      )}
      {/* 본문 렌더링은 기존 구현 유지 */}
    </article>
  );
}

// 카테고리 한글 라벨 (중복 선언 막기 위해 별도 파일로 빼도 됨)
const CATEGORY_LABELS: Record<string, string> = {
  refund: '환급금',
  voucher: '바우처',
  subsidy: '지원금',
  loan: '대출/금융',
  grant: '보조금',
  education: '교육/장학',
  housing: '주거',
  medical: '의료',
  employment: '취업/고용',
  culture: '문화/체육',
  'pregnancy-childcare': '임신·출산·육아',
};
