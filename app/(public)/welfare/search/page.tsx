import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ì ì± ê²ì',
  description: 'ëìê² ë§ë ì ë¶ ì§ìê¸ì ê²ìíì¸ì. ì¹´íê³ ë¦¬, ì§ì­, í¤ìëë¡ íí°ë§í  ì ììµëë¤.',
};

export const revalidate = 300;

const ITEMS_PER_PAGE = 20;

const REGIONS = [
  'ìì¸', 'ë¶ì°', 'ëêµ¬', 'ì¸ì²', 'ê´ì£¼', 'ëì ', 'ì¸ì°', 'ì¸ì¢',
  'ê²½ê¸°', 'ê°ì', 'ì¶©ë¶', 'ì¶©ë¨', 'ì ë¶', 'ì ë¨', 'ê²½ë¶', 'ê²½ë¨', 'ì ì£¼',
];

function parseKoreanDate(str: string | null): Date | null {
  if (!str) return null;
  const m = str.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function getDday(deadline: string | null): { text: string; urgent: boolean; color: string } | null {
  if (!deadline) return null;
  if (deadline.includes('ìì') || deadline.includes('ìì')) return { text: 'ìì', urgent: false, color: 'bg-gray-100 text-gray-600' };
  const deadlineDate = parseKoreanDate(deadline);
  if (!deadlineDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return { text: 'D-DAY', urgent: true, color: 'bg-red-100 text-red-700' };
  if (diff <= 7) return { text: `D-${diff}`, urgent: true, color: 'bg-red-100 text-red-600' };
  if (diff <= 30) return { text: `D-${diff}`, urgent: false, color: 'bg-orange-100 text-orange-600' };
  return { text: `D-${diff}`, urgent: false, color: 'bg-blue-100 text-blue-600' };
}

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; category?: string; region?: string; sort?: string; page?: string } }) {
  const query = searchParams.q || '';
  const categoryFilter = searchParams.category || '';
  const regionFilter = searchParams.region || '';
  const sortBy = searchParams.sort || 'latest';
  const currentPage = parseInt(searchParams.page || '1');

  const where: any = { status: 'PUBLISHED' };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (categoryFilter) {
    where.category = { slug: categoryFilter };
  }
  if (regionFilter) {
    where.geoRegion = { contains: regionFilter };
  }

  const orderBy: any = sortBy === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' };

  const [policies, totalCount, categories] = await Promise.all([
    prisma.policy.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        geoRegion: true, viewCount: true, deadline: true,
        publishedAt: true,
        category: { select: { name: true, slug: true, icon: true } },
      },
    }),
    prisma.policy.count({ where }),
    prisma.category.findMany({
      select: { name: true, slug: true, _count: { select: { policies: true } } },
      orderBy: { policies: { _count: 'desc' } },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  function cleanTitle(title: string): string {
    return title.replace(/^\[.*?\]\s*/, '');
  }

  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams();
    if (params.q || query) sp.set('q', params.q ?? query);
    if (params.category ?? categoryFilter) sp.set('category', params.category ?? categoryFilter);
    if (params.region ?? regionFilter) sp.set('region', params.region ?? regionFilter);
    if (params.sort ?? sortBy) sp.set('sort', params.sort ?? sortBy);
    if (params.page) sp.set('page', params.page);
    const str = sp.toString();
    return '/welfare/search' + (str ? '?' + str : '');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-6">
        <h1 className="text-white text-lg font-bold mb-3">ì ì± ê²ì</h1>
        <form action="/welfare/search" method="get" className="relative">
          <input type="text" name="q" defaultValue={query}
            placeholder="ì ì±ëª, í¤ìëë¡ ê²ì..."
            className="w-full px-4 py-3 pl-10 rounded-xl text-sm bg-white/95 focus:outline-none focus:ring-2 focus:ring-white"
          />
          <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          {regionFilter && <input type="hidden" name="region" value={regionFilter} />}
          {sortBy && <input type="hidden" name="sort" value={sortBy} />}
        </form>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          <Link href={buildUrl({ category: '', page: '1' })}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${!categoryFilter ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            ì ì²´
          </Link>
          {categories.map(cat => (
            <Link key={cat.slug} href={buildUrl({ category: cat.slug === categoryFilter ? '' : cat.slug, page: '1' })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${categoryFilter === cat.slug ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {cat.name} ({cat._count.policies})
            </Link>
          ))}
        </div>

        {/* Region Filter + Sort */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Link href={buildUrl({ region: '', page: '1' })}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition ${!regionFilter ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              ì êµ­
            </Link>
            {REGIONS.map(r => (
              <Link key={r} href={buildUrl({ region: r === regionFilter ? '' : r, page: '1' })}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition ${regionFilter === r ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {r}
              </Link>
            ))}
          </div>
          <div className="flex-shrink-0 flex gap-1">
            <Link href={buildUrl({ sort: 'latest', page: '1' })}
              className={`px-2.5 py-1 rounded-lg text-xs ${sortBy === 'latest' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              ìµì ì
            </Link>
            <Link href={buildUrl({ sort: 'popular', page: '1' })}
              className={`px-2.5 py-1 rounded-lg text-xs ${sortBy === 'popular' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              ì¸ê¸°ì
            </Link>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">ì´ <span className="font-semibold text-blue-600">{totalCount.toLocaleString()}</span>ê±´{query && <> &middot; &quot;{query}&quot; ê²ìê²°ê³¼</>}</p>

        {/* Policy Cards Grid */}
        {policies.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">ð</div>
            <p className="text-gray-500 text-sm">ê²ì ê²°ê³¼ê° ììµëë¤</p>
            <Link href="/welfare/search" className="text-blue-600 text-sm mt-2 inline-block hover:underline">ì ì²´ ì ì± ë³´ê¸°</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.map((policy) => {
              const dday = getDday(policy.deadline);
              return (
                <Link key={policy.id} href={`/welfare/${policy.slug}`}
                  className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md hover:border-blue-200 transition group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {policy.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                          {policy.category.name}
                        </span>
                      )}
                      {policy.geoRegion && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                          {policy.geoRegion}
                        </span>
                      )}
                    </div>
                    {dday && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${dday.color}`}>
                        {dday.text}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 mb-1.5">
                    {cleanTitle(policy.title)}
                  </h3>
                  {policy.excerpt && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{policy.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                      {policy.viewCount || 0}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-8">
            {currentPage > 1 && (
              <Link href={buildUrl({ page: String(currentPage - 1) })}
                className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                ì´ì 
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const startPage = Math.max(1, Math.min(currentPage - 4, totalPages - 9));
              const pageNum = startPage + i;
              if (pageNum > totalPages) return null;
              return (
                <Link key={pageNum} href={buildUrl({ page: String(pageNum) })}
                  className={`px-3 py-2 rounded-lg text-sm transition ${pageNum === currentPage ? 'bg-blue-600 text-white font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {pageNum}
                </Link>
              );
            })}
            {currentPage < totalPages && (
              <Link href={buildUrl({ page: String(currentPage + 1) })}
                className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                ë¤ì
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
