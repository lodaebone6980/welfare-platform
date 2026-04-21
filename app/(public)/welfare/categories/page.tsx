import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import Link from 'next/link';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: `분야별 정부 지원금 전체보기 | ${SITE_NAME}`,
  description:
    '생활안정·주거·보육교육·고용·의료·행정·임신출산·돌봄·문화·농어업 등 10대 분야의 정부·지자체 지원 제도를 한곳에서 확인하세요.',
  alternates: { canonical: '/welfare/categories' },
};

export const revalidate = 300;

// 실제 DB 의 10개 카테고리명에 맞춘 그라디언트 매핑
const categoryColors: Record<string, string> = {
  '생활안정': 'from-blue-500 to-cyan-500',
  '주거·자립': 'from-green-500 to-emerald-500',
  '보육·교육': 'from-yellow-500 to-orange-500',
  '고용·창업': 'from-purple-500 to-indigo-500',
  '건강·의료': 'from-red-500 to-pink-500',
  '행정·안전': 'from-gray-500 to-slate-600',
  '임신·출산': 'from-pink-500 to-rose-500',
  '보호·돌봄': 'from-orange-500 to-amber-500',
  '문화·환경': 'from-teal-500 to-cyan-500',
  '농림·축산·어업': 'from-lime-500 to-green-500',
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      _count: { select: { policies: true } },
      policies: {
        where: { status: 'PUBLISHED' },
        take: 3,
        orderBy: { viewCount: 'desc' },
        select: { id: true, title: true, slug: true, geoRegion: true },
      },
    },
  });

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6">
        <h1 className="text-white text-xl font-bold">카테고리별 정책</h1>
        <p className="text-blue-200 text-sm mt-1">분야별로 나에게 맞는 지원금을 찾아보세요</p>
      </section>

      {/* Category Grid */}
      <section className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border overflow-hidden">
              {/* Category Header */}
              <Link
                href={'/welfare/categories/' + cat.slug}
                className={"flex items-center justify-between p-4 bg-gradient-to-r text-white " + (categoryColors[cat.name] || 'from-gray-500 to-gray-600')}
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon slug={cat.slug} size={28} />
                  <div>
                    <h2 className="font-bold text-base">{cat.name.replace(/·/g, ' ')}</h2>
                    <p className="text-white/80 text-xs">{cat._count.policies}개 정책</p>
                  </div>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Top Policies */}
              <div className="p-3">
                {cat.policies.map((policy, idx) => (
                  <Link
                    key={policy.id}
                    href={'/welfare/' + encodeURIComponent(policy.slug)}
                    className="flex items-center gap-2 py-2 border-b last:border-b-0 text-sm hover:bg-gray-50"
                  >
                    <span className="text-gray-400 w-5 text-center">{idx + 1}</span>
                    <span className="text-gray-800 flex-1 truncate">{policy.title}</span>
                    <span className="text-gray-400 text-xs whitespace-nowrap">{policy.geoRegion}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
