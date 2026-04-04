import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PolicyCard from '@/components/home/PolicyCard';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '정책 검색',
  description: '정부 복지 정책을 검색하고 나에게 맞는 지원금을 찾아보세요.',
};

interface SearchPageProps {
  searchParams: { q?: string; category?: string; region?: string; sort?: string; page?: string };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const category = searchParams.category || '';
  const region = searchParams.region || '';
  const sort = searchParams.sort || 'latest';
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;

  const where: any = { status: 'PUBLISHED' as const };
  
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
      { tags: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (category) {
    where.category = { slug: category };
  }
  if (region) {
    where.geoRegion = region;
  }

  const orderBy: any = sort === 'popular' 
    ? { viewCount: 'desc' } 
    : { publishedAt: 'desc' };

  const [policies, totalCount, categories, regions] = await Promise.all([
    prisma.policy.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: { category: true },
    }),
    prisma.policy.count({ where }),
    prisma.category.findMany({ orderBy: { displayOrder: 'asc' }, include: { _count: { select: { policies: true } } } }),
    prisma.policy.groupBy({ by: ['geoRegion'], where: { status: 'PUBLISHED', geoRegion: { not: null } }, _count: true, orderBy: { _count: { geoRegion: 'desc' } } }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 sticky top-14 md:top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <form action="/welfare/search" method="GET" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="정책명, 키워드로 검색..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-100 border-0 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {category && <input type="hidden" name="category" value={category} />}
            {region && <input type="hidden" name="region" value={region} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
          </form>

          {/* Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <Link href="/welfare/search"
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!category && !region ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              전체
            </Link>
            {categories.slice(0, 8).map(cat => (
              <Link key={cat.slug} href={`/welfare/search?category=${cat.slug}${query ? '&q=' + query : ''}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat.slug ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat.icon} {cat.name} ({cat._count.policies})
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {query && <><strong className="text-gray-900">"{query}"</strong> 검색 결과 </>}
            총 <strong className="text-blue-600">{totalCount.toLocaleString()}</strong>건
          </p>
          <div className="flex gap-1">
            <Link href={`/welfare/search?${new URLSearchParams({ ...searchParams as any, sort: 'latest' }).toString()}`}
              className={`px-2 py-1 rounded text-xs ${sort === 'latest' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              최신순
            </Link>
            <Link href={`/welfare/search?${new URLSearchParams({ ...searchParams as any, sort: 'popular' }).toString()}`}
              className={`px-2 py-1 rounded text-xs ${sort === 'popular' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              인기순
            </Link>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">다른 키워드로 검색해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.map(policy => (
              <PolicyCard key={policy.slug} policy={policy} variant="horizontal" />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            {page > 1 && (
              <Link href={`/welfare/search?${new URLSearchParams({ ...searchParams as any, page: String(page - 1) }).toString()}`}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm hover:bg-gray-50">
                이전
              </Link>
            )}
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={`/welfare/search?${new URLSearchParams({ ...searchParams as any, page: String(page + 1) }).toString()}`}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm hover:bg-gray-50">
                다음
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
