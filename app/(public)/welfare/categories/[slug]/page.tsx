import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import CategoryIcon from '@/components/ui/CategoryIcon';

export const revalidate = 300;
export const dynamicParams = true;

const ITEMS_PER_PAGE = 20;

const categoryColors: Record<string, string> = {
  '환급금': 'from-orange-500 to-amber-500',
  '바우처': 'from-purple-500 to-indigo-500',
  '지원금': 'from-blue-500 to-cyan-500',
  '대출': 'from-green-500 to-emerald-500',
  '보조금': 'from-pink-500 to-rose-500',
  '교육': 'from-yellow-500 to-orange-500',
  '주거': 'from-teal-500 to-green-500',
  '의료': 'from-red-500 to-pink-500',
  '고용': 'from-indigo-500 to-blue-500',
  '문화': 'from-fuchsia-500 to-purple-500',
};

function parseKoreanDate(str: string | null): Date | null {
  if (!str) return null;
  const m = str.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function getDday(deadline: string | null): { text: string; color: string } | null {
  if (!deadline) return null;
  if (deadline.includes('상시') || deadline.includes('수시')) {
    return { text: '상시', color: 'bg-gray-100 text-gray-600' };
  }
  const d = parseKoreanDate(deadline);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return { text: 'D-DAY', color: 'bg-red-100 text-red-700' };
  if (diff <= 7) return { text: `D-${diff}`, color: 'bg-red-100 text-red-600' };
  if (diff <= 30) return { text: `D-${diff}`, color: 'bg-orange-100 text-orange-600' };
  return { text: `D-${diff}`, color: 'bg-blue-100 text-blue-600' };
}

function cleanTitle(title: string): string {
  return title.replace(/^\[.*?\]\s*/, '');
}

export async function generateStaticParams() {
  try {
    const cats = await prisma.category.findMany({ select: { slug: true } });
    return cats.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  if (!cat) return { title: '카테고리를 찾을 수 없습니다' };
  return {
    title: `${cat.name} 정책 - 복지길잡이`,
    description: `${cat.name} 관련 정부 지원금, 보조금, 복지 정책 정보를 한눈에 확인하세요.`,
    openGraph: {
      title: `${cat.name} 정책 | 복지길잡이`,
      description: `${cat.name} 분야의 최신 정부 지원금과 복지 정책.`,
      type: 'website',
    },
  };
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string; sort?: string };
}) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, icon: true },
  });
  if (!category) notFound();

  const currentPage = Math.max(1, parseInt(searchParams.page || '1'));
  const sortBy = searchParams.sort === 'popular' ? 'popular' : 'latest';
  const orderBy: any = sortBy === 'popular' ? { viewCount: 'desc' } : { publishedAt: 'desc' };

  const [policies, totalCount] = await Promise.all([
    prisma.policy.findMany({
      where: { status: 'PUBLISHED', categoryId: category.id },
      orderBy,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        geoRegion: true,
        deadline: true,
        publishedAt: true,
      },
    }),
    prisma.policy.count({ where: { status: 'PUBLISHED', categoryId: category.id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const heroGradient = categoryColors[category.name] || 'from-blue-600 to-indigo-700';

  function buildUrl(p: { page?: number; sort?: string }) {
    const sp = new URLSearchParams();
    const sortVal = p.sort ?? sortBy;
    if (sortVal && sortVal !== 'latest') sp.set('sort', sortVal);
    if (p.page && p.page > 1) sp.set('page', String(p.page));
    const qs = sp.toString();
    return `/welfare/categories/${category.slug}` + (qs ? `?${qs}` : '');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero */}
      <section className={`bg-gradient-to-br ${heroGradient} px-4 pt-8 pb-6 text-white`}>
        <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
          <Link href="/" className="hover:underline">홈</Link>
          <span>/</span>
          <Link href="/welfare/categories" className="hover:underline">카테고리</Link>
          <span>/</span>
          <span className="text-white">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <CategoryIcon slug={category.slug} size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{category.name}</h1>
            <p className="text-white/80 text-xs mt-0.5">
              {totalCount.toLocaleString()}개의 정책이 있어요
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Sort toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">
            총 <span className="font-semibold text-blue-600">{totalCount.toLocaleString()}</span>건
          </p>
          <div className="flex gap-1">
            <Link
              href={buildUrl({ sort: 'latest', page: 1 })}
              className={`px-2.5 py-1 rounded-lg text-xs ${sortBy === 'latest' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              최신순
            </Link>
            <Link
              href={buildUrl({ sort: 'popular', page: 1 })}
              className={`px-2.5 py-1 rounded-lg text-xs ${sortBy === 'popular' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              인기순
            </Link>
          </div>
        </div>

        {/* Empty state */}
        {policies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">아직 등록된 정책이 없어요</p>
            <Link
              href="/welfare/search"
              className="inline-block mt-3 text-blue-600 text-sm hover:underline"
            >
              전체 정책 둘러보기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {policies.map((policy) => {
              const dday = getDday(policy.deadline);
              return (
                <Link
                  key={policy.id}
                  href={`/welfare/${encodeURIComponent(policy.slug)}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                        {category.name}
                      </span>
                      {policy.geoRegion && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                          📍 {policy.geoRegion}
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
                    <p className="text-xs text-gray-500 line-clamp-2">{policy.excerpt}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-8">
            {currentPage > 1 && (
              <Link
                href={buildUrl({ page: currentPage - 1 })}
                className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                이전
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const startPage = Math.max(1, Math.min(currentPage - 4, totalPages - 9));
              const pageNum = startPage + i;
              if (pageNum > totalPages) return null;
              return (
                <Link
                  key={pageNum}
                  href={buildUrl({ page: pageNum })}
                  className={`px-3 py-2 rounded-lg text-sm transition ${pageNum === currentPage ? 'bg-blue-600 text-white font-medium' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {pageNum}
                </Link>
              );
            })}
            {currentPage < totalPages && (
              <Link
                href={buildUrl({ page: currentPage + 1 })}
                className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                다음
              </Link>
            )}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-8">
          <Link
            href="/welfare/categories"
            className="block text-center bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50"
          >
            다른 카테고리 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
