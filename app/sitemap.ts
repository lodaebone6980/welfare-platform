import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://yourdomain.com'

const GEO_REGIONS = [
  '서울','경기','부산','인천','대구','대전',
  '광주','울산','세종','강원','충북','충남',
  '전북','전남','경북','경남','제주',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let policies: any[] = []
  try {
    policies = await prisma.policy.findMany({
      where:   { status: 'PUBLISHED' },
      select:  { slug: true, updatedAt: true, priority: true },
      orderBy: { updatedAt: 'desc' },
    })
  } catch (e) {
    policies = []
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,              lastModified: new Date(), changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE_URL}/welfare`, lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/news`,    lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
  ]

  const geoPages: MetadataRoute.Sitemap = GEO_REGIONS.map(region => ({
    url:             `${BASE_URL}/welfare/${encodeURIComponent(region)}`,
    lastModified:    new Date(),
    changeFrequency: 'weekly' as const,
    priority:        0.85,
  }))

  const policyPages: MetadataRoute.Sitemap = policies.map((p: any) => ({
    url:             `${BASE_URL}/welfare/${p.slug}`,
    lastModified:    p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority:        p.priority ?? 0.8,
  }))

  return [...staticPages, ...geoPages, ...policyPages]
}
