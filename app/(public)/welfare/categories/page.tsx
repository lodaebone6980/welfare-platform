import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import { CategoryIcon } from '@/components/CategoryIcon';

export const metadata: Metadata = {
  title: '카테고리별 정책',
  description: '분야별로 나에게 맞는 정부 지원금을 찾아보세요.',
};

export const revalidate = 300;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  '환급금': { bg: 'from-green-500 to-emerald-600', text: 'text-green-700', light: 'bg-green-50' },
  '바우처': { bg: 'from-purple-500 to-violet-600', text: 'text-purple-700', light: 'bg-purple-50' },
  '지원금': { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', light: 'bg-blue-50' },
  '대출': { bg: 'from-amber-500 to-orange-600', text: 'text-amber-700', light: 'bg-amber-50' },
  '보조금': { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-700', light: 'bg-teal-50' },
  '교육': { bg: 'from-indigo-500 to-indigo-600', text: 'text-indigo-700', light: 'bg-indigo-50' },
  '주거': { bg: 'from-rose-500 to-pink-600', text: 'text-rose-700', light: 'bg-rose-50' },
  '의료': { bg: 'from-sky-500 to-sky-600', text: 'text-sky-700', light: 'bg-sky-50' },
  '고용': { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-700', light: 'bg-yellow-50' },
  '문화': { bg: 'from-fuchsia-500 to-pink-600', text: 'text-fuchsia-700', light: 'bg-fuchsia-50' },
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    select: {
      id: true, name: true, slug: true, icon: true, description: true,
      _count: { select: { policies: true } },
      policies: {
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 3,
        select: { title: true, slug: true, geoRegion: true },
      },
    },
    orderBy: { policies: { _count: 'desc' } },
  });

  function cleanTitle(title: string): string {
    return title.replace(/^\[.*?\]\s*/, '');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-6 text-center">
        <h1 className="text-white text-lg font-bold">카테고리별 정책</h1>
        <p className="text-blue-100 text-xs mt-1">분야별로 나에게 맞는 지원금을 찾아보세요</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const colors = CATEGORY_COLORS[cat.name] || { bg: 'from-gray-500 to-gray-600', text: 'text-gray-700', light: 'bg-gray-50' };
            return (
              <div key={cat.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition">
                <Link href={`/welfare/search?category=${cat.slug}`}>
                  <div className={`bg-gradient-to-r ${colors.bg} px-5 py-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <CategoryIcon icon={cat.icon || cat.name} className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-base">{cat.name}</h2>
                        <p className="text-white/80 text-xs">{cat._count.policies}개 정책</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                {cat.policies.length > 0 && (
                  <div className="px-5 py-3 space-y-2">
                    {cat.policies.map((policy, idx) => (
                      <Link key={idx} href={`/welfare/${policy.slug}`}
                        className="flex items-center gap-2 group">
                        <span className={`text-[10px] font-bold ${colors.text} w-4`}>{idx + 1}</span>
                        <span className="text-xs text-gray-700 group-hover:text-blue-600 truncate flex-1">
                          {cleanTitle(policy.title)}
                        </span>
                        {policy.geoRegion && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{policy.geoRegion}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
