import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/env';
import { isPolicyIndexableForAdsense } from '@/lib/policy-quality';
import { getPolicySlugFamilyBase } from '@/lib/policy-canonical';

const BASE_URL = SITE_URL;

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      canonicalId: true,
      content: true,
      excerpt: true,
      description: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      applyUrl: true,
      externalUrl: true,
      updatedAt: true,
      viewCount: true,
      category: { select: { slug: true, name: true } },
      faqs: { select: { question: true, answer: true } },
    },
    orderBy: { id: 'asc' },
    take: 50000,
  });

  const canonicalPolicies = new Map<string, (typeof policies)[number]>();
  for (const policy of policies) {
    if (policy.canonicalId && policy.canonicalId !== policy.id) continue;
    if (!isPolicyIndexableForAdsense(policy)) continue;

    const key = `slug:${getPolicySlugFamilyBase(policy.slug)}`;

    if (!canonicalPolicies.has(key)) {
      canonicalPolicies.set(key, policy);
    }
  }

  const urls = Array.from(canonicalPolicies.values())
    .map((p) => {
      const priority = Math.min(0.9, 0.5 + (p.viewCount || 0) * 0.001).toFixed(2);
      const path = `/welfare/${encodeURIComponent(p.slug)}`;

      return `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
