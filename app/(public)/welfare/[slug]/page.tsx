import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

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
      include: { category: true }
    });
    return policy;
  } catch (error) {
    console.error('Error fetching policy:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const policy = await getPolicy(params.slug);
  if (!policy) return { title: '정책 정보 | 정책지금' };
  return {
    title: policy.title + ' | 정책지금',
    description: policy.metaDesc || policy.excerpt || policy.title,
  };
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const policy = await getPolicy(params.slug);
  if (!policy) notFound();

  // Try to increment view count
  try {
    await prisma.policy.update({
      where: { id: policy.id },
      data: { viewCount: { increment: 1 } }
    });
  } catch (e) { /* ignore view count errors */ }

  // Get related policies
  let relatedPolicies: any[] = [];
  try {
    relatedPolicies = await prisma.policy.findMany({
      where: {
        categoryId: policy.categoryId,
        id: { not: policy.id },
        status: 'PUBLISHED'
      },
      take: 4,
      include: { category: true }
    });
  } catch (e) { /* ignore */ }

  const categoryName = policy.category?.name || '복지';
  const categoryColors: Record<string, string> = {
    '환급금': 'bg-green-100 text-green-800',
    '바우처': 'bg-purple-100 text-purple-800',
    '지원금': 'bg-blue-100 text-blue-800',
    '대출': 'bg-orange-100 text-orange-800',
    '보조금': 'bg-teal-100 text-teal-800',
    '교육': 'bg-indigo-100 text-indigo-800',
    '주거': 'bg-rose-100 text-rose-800',
    '의료': 'bg-red-100 text-red-800',
    '고용': 'bg-amber-100 text-amber-800',
    '문화': 'bg-pink-100 text-pink-800',
  };
  const badgeColor = categoryColors[categoryName] || 'bg-gray-100 text-gray-800';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <nav className="text-sm mb-4 opacity-80">
            <Link href="/" className="hover:underline">홈</Link>
            <span className="mx-2">&gt;</span>
            <Link href="/welfare/search" className="hover:underline">정책검색</Link>
            <span className="mx-2">&gt;</span>
            <span>{policy.title}</span>
          </nav>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${badgeColor}`}>
            {categoryName}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold">{policy.title}</h1>
          {policy.geoRegion && (
            <p className="mt-2 opacity-80">📍 {policy.geoRegion}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">📋 요약 정보</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {policy.eligibility && (
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600 font-medium mb-1">지원 대상</p>
                <p className="text-gray-800">{policy.eligibility}</p>
              </div>
            )}
            {policy.applicationMethod && (
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600 font-medium mb-1">신청 방법</p>
                <p className="text-gray-800">{policy.applicationMethod}</p>
              </div>
            )}
            {policy.deadline && (
              <div className="p-4 bg-orange-50 rounded-xl">
                <p className="text-sm text-orange-600 font-medium mb-1">마감일</p>
                <p className="text-gray-800">{policy.deadline}</p>
              </div>
            )}
            {policy.requiredDocuments && (
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-sm text-purple-600 font-medium mb-1">필요 서류</p>
                <p className="text-gray-800">{policy.requiredDocuments}</p>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {policy.content && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">상세 설명</h2>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: policy.content }} />
          </div>
        )}

        {/* Apply Button */}
        {policy.applyUrl && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center">
            <a
              href={policy.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
            >
              신청하기 →
            </a>
          </div>
        )}

        {/* Related Policies */}
        {relatedPolicies.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">관련 정책</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {relatedPolicies.map((rp: any) => (
                <Link key={rp.id} href={`/welfare/${rp.slug}`} className="block p-4 border rounded-xl hover:bg-gray-50 transition">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${categoryColors[rp.category?.name || ''] || 'bg-gray-100 text-gray-800'}`}>
                    {rp.category?.name || '복지'}
                  </span>
                  <h3 className="font-semibold text-gray-900">{rp.title}</h3>
                  {rp.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{rp.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
