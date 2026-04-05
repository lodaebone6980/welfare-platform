import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://welfare-platform-five.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: BASE_URL + '/welfare/search',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: BASE_URL + '/welfare/categories',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: BASE_URL + '/recommend',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // Dynamic policy pages
  let policyPages: MetadataRoute.Sitemap = [];
  try {
    const policies = await prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, updatedAt: true, viewCount: true },
      orderBy: { updatedAt: 'desc' },
    });

    policyPages = policies.map((policy) => ({
      url: BASE_URL + '/welfare/' + encodeURIComponent(policy.slug),
      lastModified: policy.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: Math.min(0.8, 0.5 + (policy.viewCount || 0) * 0.001),
    }));
  } catch (error) {
    console.error('Sitemap generation error:', error);
  }

  // Category pages
  let categoryPages: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true },
    });
    categoryPages = categories.map((cat) => ({
      url: BASE_URL + '/welfare/categories/' + encodeURIComponent(cat.slug),
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Category sitemap error:', error);
  }

  return [...staticPages, ...categoryPages, ...policyPages];
}
