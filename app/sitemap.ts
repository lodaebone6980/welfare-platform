import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://welfare-platform-five.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/welfare/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/welfare/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // Dynamic policy pages
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  const policyPages: MetadataRoute.Sitemap = policies.map(policy => ({
    url: `${SITE_URL}/welfare/${policy.slug}`,
    lastModified: policy.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Category pages
  const categories = await prisma.category.findMany({ select: { slug: true } });
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${SITE_URL}/welfare/search?category=${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  // Region pages
  const regions = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  const regionPages: MetadataRoute.Sitemap = regions.map(region => ({
    url: `${SITE_URL}/welfare/search?region=${encodeURIComponent(region)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.4,
  }));

  return [...staticPages, ...policyPages, ...categoryPages, ...regionPages];
}
