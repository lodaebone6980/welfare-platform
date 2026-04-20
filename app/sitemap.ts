import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// SEO/GEO/AEO: 실제 운영 도메인으로 통일 (구 Vercel preview URL 제거)
const BASE_URL = 'https://www.govmate.co.kr';

// 사이트맵은 매시간 재생성 (정책 신규 등록 빠르게 반영, AEO 우대)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1) 정적 페이지 - GEO/AEO 핵심 진입 경로
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/welfare/search`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/welfare/categories`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/recommend`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/more`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/notifications`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.4,
    },
  ];

  // 1-1) 법적/소개 페이지 (AdSense, SEO 신뢰도용)
  const LEGAL_SLUGS = ['about', 'terms', 'privacy-policy', 'contact'] as const;
  let legalPages: MetadataRoute.Sitemap = LEGAL_SLUGS.map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: slug === 'about' ? 0.6 : 0.4,
  }));
  try {
    const rows = await prisma.sitePage.findMany({
      where: { slug: { in: [...LEGAL_SLUGS] } },
      select: { slug: true, updatedAt: true },
    });
    const map = new Map(rows.map((r) => [r.slug, r.updatedAt]));
    legalPages = legalPages.map((p) => {
      const slug = p.url.split('/').pop() ?? '';
      const updated = map.get(slug);
      return updated ? { ...p, lastModified: updated } : p;
    });
  } catch (error) {
    console.error('[sitemap] sitePage fetch error:', error);
  }

  // 2) 카테고리 상세 페이지
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    });
    categoryPages = categories.map((cat) => ({
      // 한글 slug 안전 처리: 슬래시는 보존하되 특수문자만 인코딩
      url: `${BASE_URL}/welfare/categories/${encodeURIComponent(cat.slug)}`,
      lastModified: cat.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));
  } catch (error) {
    console.error('[sitemap] category fetch error:', error);
  }

  // 3) 정책 상세 페이지 (PUBLISHED만)
  let policyPages: MetadataRoute.Sitemap = [];
  try {
    const policies = await prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, viewCount: true },
      orderBy: { updatedAt: 'desc' },
    });
    policyPages = policies.map((policy) => {
      // viewCount 가중치로 우선순위 0.5~0.85 사이 분포 (AEO에서 인기 콘텐츠 우대)
      const views = policy.viewCount || 0;
      const priority = Math.min(0.85, 0.5 + Math.log10(views + 1) * 0.07);
      return {
        url: `${BASE_URL}/welfare/${encodeURIComponent(policy.slug)}`,
        lastModified: policy.updatedAt ?? now,
        changeFrequency: 'weekly' as const,
        priority: Number(priority.toFixed(2)),
      };
    });
  } catch (error) {
    console.error('[sitemap] policy fetch error:', error);
  }

  return [...staticPages, ...legalPages, ...categoryPages, ...policyPages];
}
