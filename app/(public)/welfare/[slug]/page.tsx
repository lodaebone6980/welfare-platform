import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  generatePolicyJsonLd,
  generateBreadcrumbJsonLd,
  generateFaqJsonLd,
  generatePolicyMetaDescription,
  generatePolicyOgData,
  PolicySeoData,
} from '@/lib/seo';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
};

async function getPolicy(slug: string) {
  try {
    const decodedSlug = decodeURIComponent(slug);
    const policy = await prisma.policy.findUnique({
      where: { slug: decodedSlug },
      include: { category: true },
    });
    return policy;
  } catch (error) {
    console.error('Error fetching policy:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const policy = await getPolicy(params.slug);
  if (!policy) return { title: 'ì ì± ì ë³´ | ì ì±ì§ê¸' };

  const seoData: PolicySeoData = {
    title: policy.title,
    slug: policy.slug,
    description: policy.description,
    excerpt: policy.excerpt,
    category: policy.category?.name,
    categorySlug: policy.category?.slug,
    geoRegion: policy.geoRegion,
    eligibility: policy.eligibility,
    applicationMethod: policy.applicationMethod,
    requiredDocuments: policy.requiredDocuments,
    applyUrl: policy.applyUrl,
    publishedAt: policy.publishedAt,
    updatedAt: policy.updatedAt,
  };

  const ogData = generatePolicyOgData(seoData);
  const metaDesc = generatePolicyMetaDescription(seoData);

  return {
    title: policy.title,
    description: metaDesc,
    keywords: [
      policy.category?.name || 'ë³µì§',
      policy.geoRegion || 'ì êµ­',
      'ì ë¶ì§ìê¸',
      'ë³´ì¡°ê¸',
      'ë³µì§íí',
      policy.title.replace(/^\[.*?\]\s*/, ''),
    ].filter(Boolean).join(', '),
    alternates: {
      canonical: 'https://welfare-platform-five.vercel.app/welfare/' + encodeURIComponent(policy.slug),
    },
    openGraph: {
      ...ogData,
      images: [
        {
          url: 'https://welfare-platform-five.vercel.app/og-image.png',
          width: 1200,
          height: 630,
          alt: policy.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: policy.title + ' | ì ì±ì§ê¸',
      description: metaDesc,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large' as any,
      'max-video-preview': -1,
    },
  };
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const policy = await getPolicy(params.slug);
  if (!policy) notFound();

  // Increment view count
  try {
    await prisma.policy.update({
      where: { id: policy.id },
      data: { viewCount: { increment: 1 } },
    });
  } catch (e) { /* ignore */ }

  // Get related policies
  let relatedPolicies: any[] = [];
  try {
    relatedPolicies = await prisma.policy.findMany({
      where: {
        categoryId: policy.categoryId,
        id: { not: policy.id },
        status: 'PUBLISHED',
      },
      take: 4,
      include: { category: true },
    });
  } catch (e) { /* ignore */ }

  const categoryName = policy.category?.name || 'ë³µì§';
  const cleanTitle = policy.title.replace(/^\[.*?\]\s*/, '');

  // SEO structured data
  const seoData: PolicySeoData = {
    title: policy.title,
    slug: policy.slug,
    description: policy.description,
    excerpt: policy.excerpt,
    category: policy.category?.name,
    categorySlug: policy.category?.slug,
    geoRegion: policy.geoRegion,
    eligibility: policy.eligibility,
    applicationMethod: policy.applicationMethod,
    requiredDocuments: policy.requiredDocuments,
    applyUrl: policy.applyUrl,
    externalUrl: policy.externalUrl,
    publishedAt: policy.publishedAt,
    updatedAt: policy.updatedAt,
  };

  const policyJsonLd = generatePolicyJsonLd(seoData);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(seoData);
  const faqJsonLd = generateFaqJsonLd(seoData);

  return (
    <>
      {/* Structured Data for SEO/AEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(policyJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Breadcrumb Navigation */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="flex items-center text-sm text-gray-500 flex-wrap gap-1">
            <li><Link href="/" className="hover:text-blue-600">í</Link></li>
            <li className="mx-1">/</li>
            <li><Link href="/welfare/search" className="hover:text-blue-600">ì ì±ê²ì</Link></li>
            {policy.category && (
              <>
                <li className="mx-1">/</li>
                <li>
                  <Link href={'/welfare/categories/' + policy.category.slug} className="hover:text-blue-600">
                    {policy.category.name}
                  </Link>
                </li>
              </>
            )}
            <li className="mx-1">/</li>
            <li className="text-gray-800 font-medium truncate max-w-[200px]">{cleanTitle}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {categoryName}
            </span>
            {policy.geoRegion && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                ð {policy.geoRegion}
              </span>
            )}
            {policy.status === 'PUBLISHED' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                ëª¨ì§ì¤
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
            {cleanTitle}
          </h1>
          {policy.excerpt && (
            <p className="text-gray-600 text-base leading-relaxed">{policy.excerpt}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            {policy.publishedAt && (
              <span>ë±ë¡ì¼: {new Date(policy.publishedAt).toLocaleDateString('ko-KR')}</span>
            )}
            <span>ì¡°í {(policy.viewCount || 0).toLocaleString()}í</span>
          </div>
        </header>

        {/* Quick Summary Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">ð íëì ë³´ê¸°</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-800 whitespace-nowrap">ì¹´íê³ ë¦¬</span>
              <span className="text-gray-700">{categoryName}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-blue-800 whitespace-nowrap">ì§ì­</span>
              <span className="text-gray-700">{policy.geoRegion || 'ì êµ­'}</span>
            </div>
            {policy.deadline && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-blue-800 whitespace-nowrap">ë§ê°ì¼</span>
                <span className="text-gray-700">{policy.deadline}</span>
              </div>
            )}
          </div>
        </div>

        {/* Detail Sections */}
        <div className="space-y-6 mb-8">
          {policy.description && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                ìì¸ ì¤ëª
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border">
                {policy.description}
              </div>
            </section>
          )}

          {policy.eligibility && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-green-600 rounded-full"></span>
                ì§ì ëì
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border">
                {policy.eligibility}
              </div>
            </section>
          )}

          {policy.applicationMethod && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-purple-600 rounded-full"></span>
                ì ì²­ ë°©ë²
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border">
                {policy.applicationMethod}
              </div>
            </section>
          )}

          {policy.requiredDocuments && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-orange-600 rounded-full"></span>
                íì ìë¥
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-white rounded-lg p-4 border">
                {policy.requiredDocuments}
              </div>
            </section>
          )}
        </div>

        {/* Apply Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          {policy.applyUrl && (
            <a
              href={policy.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg shadow-lg"
            >
              ð ì ì²­íê¸°
            </a>
          )}
          {policy.externalUrl && (
            <a
              href={policy.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-white hover:bg-gray-50 text-blue-600 font-semibold py-4 px-6 rounded-xl border-2 border-blue-600 transition-colors"
            >
              ð ë³µì§ë¡ìì ë³´ê¸°
            </a>
          )}
        </div>

        {/* Share Info */}
        <div className="flex items-center gap-3 mb-10 p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
          ì´ ì ì± ì ë³´ê° ëìì´ ëì¨ëì? ì£¼ë³ì íìí ë¶ê» ê³µì í´ì£¼ì¸ì.
        </div>

        {/* Related Policies */}
        {relatedPolicies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">ê´ë ¨ ì ì±</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPolicies.map((rp) => (
                <Link
                  key={rp.id}
                  href={'/welfare/' + encodeURIComponent(rp.slug)}
                  className="block p-4 bg-white border rounded-xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {rp.category?.name || 'ë³µì§'}
                    </span>
                    {rp.geoRegion && (
                      <span className="text-xs text-gray-400">ð {rp.geoRegion}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm">
                    {rp.title.replace(/^\[.*?\]\s*/, '')}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
