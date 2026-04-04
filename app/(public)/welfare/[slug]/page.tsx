import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: { slug: string };
}

async function getPolicy(slug: string) {
  const policy = await prisma.policy.findUnique({
    where: { slug },
    include: { category: true, faqs: { orderBy: { order: 'asc' } } },
  });
  if (policy) {
    await prisma.policy.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
  }
  return policy;
}

async function getRelatedPolicies(categoryId: number | null, currentSlug: string) {
  if (!categoryId) return [];
  return prisma.policy.findMany({
    where: { categoryId, status: 'PUBLISHED', slug: { not: currentSlug } },
    take: 4,
    orderBy: { viewCount: 'desc' },
    include: { category: true },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const policy = await prisma.policy.findUnique({ where: { slug: params.slug } });
  if (!policy) return { title: '정책을 찾을 수 없습니다' };
  return {
    title: policy.title,
    description: policy.metaDesc || policy.excerpt || policy.title,
    openGraph: {
      title: policy.title,
      description: policy.excerpt || '',
      type: 'article',
      publishedTime: policy.publishedAt?.toISOString(),
    },
  };
}

export const revalidate = 1800;

export default async function PolicyDetailPage({ params }: PageProps) {
  const policy = await getPolicy(params.slug);
  if (!policy) notFound();
  
  const relatedPolicies = await getRelatedPolicies(policy.categoryId, policy.slug);
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: policy.title,
    description: policy.excerpt || '',
    provider: { '@type': 'GovernmentOrganization', name: '대한민국 정부' },
    areaServed: policy.geoRegion || '대한민국',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
          <div className="flex items-center gap-2 mb-3">
            <Link href="/" className="text-blue-200 hover:text-white text-sm">홈</Link>
            <span className="text-blue-300">/</span>
            {policy.category && (
              <>
                <Link href={`/welfare/search?category=${policy.category.slug}`} className="text-blue-200 hover:text-white text-sm">
                  {policy.category.name}
                </Link>
                <span className="text-blue-300">/</span>
              </>
            )}
          </div>
          <h1 className="text-xl md:text-3xl font-bold leading-tight">{policy.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-blue-100">
            {policy.geoRegion && <span>📍 {policy.geoRegion}</span>}
            <span>👁 {policy.viewCount.toLocaleString()}</span>
            {policy.publishedAt && (
              <span>{new Date(policy.publishedAt).toLocaleDateString('ko-KR')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4">
        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Quick Info */}
          {(policy.eligibility || policy.applicationMethod || policy.deadline) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-blue-50/50 border-b border-gray-100">
              {policy.eligibility && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">지원 대상</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{policy.eligibility}</p>
                </div>
              )}
              {policy.applicationMethod && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">신청 방법</p>
                  <p className="text-sm text-gray-700 line-clamp-3">{policy.applicationMethod}</p>
                </div>
              )}
              {policy.deadline && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">신청 기한</p>
                  <p className="text-sm text-gray-700">{policy.deadline}</p>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-5 md:p-8">
            <div 
              className="prose prose-sm md:prose-base max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600"
              dangerouslySetInnerHTML={{ __html: policy.content }} 
            />
          </div>

          {/* Apply Button */}
          {policy.applyUrl && (
            <div className="p-5 border-t border-gray-100 bg-gray-50">
              <a href={policy.applyUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                신청하러 가기 →
              </a>
            </div>
          )}
        </div>

        {/* FAQs */}
        {policy.faqs.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">자주 묻는 질문</h2>
            <div className="space-y-3">
              {policy.faqs.map(faq => (
                <details key={faq.id} className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-800">Q. {faq.question}</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-3 pb-3 text-sm text-gray-600">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Related Policies */}
        {relatedPolicies.length > 0 && (
          <div className="mt-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">관련 정책</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relatedPolicies.map(rp => (
                <Link key={rp.slug} href={`/welfare/${rp.slug}`}
                  className="block p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">{rp.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {rp.category && <span className="text-xs text-blue-600">{rp.category.name}</span>}
                    {rp.geoRegion && <span className="text-xs text-gray-400">📍 {rp.geoRegion}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
