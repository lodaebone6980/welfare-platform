/**
 * sitemap.ts 교체용 — 11개 카테고리 + 정책 상세 + 가이드/정적 페이지
 * ------------------------------------------------------------------
 * 파일 위치: app/sitemap.ts
 *
 * 기존 /welfare/* 는 넣지 않음 (301 redirect로 처리되므로 색인 유도 X).
 * 각 섹션에 적절한 priority/changefreq 부여.
 */

import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { ALL_CATEGORIES } from '@/lib/categories';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://govmate.co.kr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) 홈 + 정적 페이지
  const staticUrls: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/policies`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];

  // 2) 카테고리 랜딩 11종
  const categoryUrls: MetadataRoute.Sitemap = ALL_CATEGORIES.map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 3) 정책 상세
  const policies = await prisma.policy.findMany({
    where: { published: true },
    select: { slug: true, category: true, updatedAt: true },
  });
  const policyUrls: MetadataRoute.Sitemap = policies
    .filter((p) => p.category && ALL_CATEGORIES.includes(p.category as any))
    .map((p) => ({
      url: `${SITE_URL}/${p.category}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  // 4) 가이드/블로그 (표 형식)
  const guides = await prisma.guide
    ?.findMany?.({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    })
    .catch(() => []);
  const guideUrls: MetadataRoute.Sitemap = (guides ?? []).map((g: { slug: string; updatedAt: Date }) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: g.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticUrls, ...categoryUrls, ...policyUrls, ...guideUrls];
}
