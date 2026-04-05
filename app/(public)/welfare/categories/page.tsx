import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import CategoryIcon from '@/components/ui/CategoryIcon';

export const metadata: Metadata = {
  title: 'ì¹´íê³ ë¦¬ë³ ì ì±',
  description: 'ë¶ì¼ë³ë¡ ëìê² ë§ë ì ë¶ ì§ìê¸ì ì°¾ìë³´ì¸ì.',
};

export const revalidate = 300;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  'íê¸ê¸': { bg: 'from-green-500 to-emerald-600', text: 'text-green-700', light: 'bg-green-50' },
  'ë°ì°ì²': { bg: 'from-purple-500 to-violet-600', text: 'text-purple-700', light: 'bg-purple-50' },
  'ì§ìê¸': { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', light: 'bg-blue-50' },
  'ëì¶': { bg: 'from-amber-500 to-orange-600', text: 'text-amber-700', light: 'bg-amber-50' },
  'ë³´ì¡°ê¸': { bg: 'from-teal-500 to-cyan-600', text: 'text-teal-700', light: 'bg-teal-50' },
  'êµì¡': { bg: 'from-indigo-500 to-indigo-600', text: 'text-indigo-700', light: 'bg-indigo-50' },
  'ì£¼ê±°': { bg: 'from-rose-500 to-pink-600', text: 'text-rose-700', light: 'bg-rose-50' },
  'ìë£': { bg: 'from-sky-500 to-sky-600', text: 'text-sky-700', light: 'bg-sky-50' },
  'ê³ ì©': { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-700', light: 'bg-yellow-50' },
  'ë¬¸í': { bg: 'from-fuchsia-500 to-pink-600', text: 'text-fuchsia-700', light: 'bg-fuchsia-50' },
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
        <h1 className="text-white text-lg font-bold">ì¹´íê³ ë¦¬ë³ ì ì±</h1>
        <p className="text-blue-100 text-xs mt-1">ë¶ì¼ë³ë¡ ëìê² ë§ë ì§ìê¸ì ì°¾ìë³´ì¸ì</p>
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
                        <CategoryIcon slug={cat.slug} className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-base">{cat.name}</h2>
                        <p className="text-white/80 text-xs">{cat._count.policies}ê° ì ì±</p>
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
