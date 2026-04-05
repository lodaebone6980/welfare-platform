import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CategoryIcon from '@/components/ui/CategoryIcon';

export const metadata: Metadata = {
  title: 'ì ì±ì§ê¸ - ëìê² ë§ë ì ë¶ ì§ìê¸ ì°¾ê¸°',
  description: '2024ë ìµì  ì ë¶ ë³µì§ ì ì±, ì§ìê¸, ë³´ì¡°ê¸ ì ë³´ë¥¼ íëì! ìíìì , ì£¼ê±°, êµì¡, ê³ ì©, ê±´ê° ë± ë§ì¶¤í ë³µì§ ìë¹ì¤ë¥¼ ì°¾ìë³´ì¸ì.',
  openGraph: {
    title: 'ì ì±ì§ê¸ - ëìê² ë§ë ì ë¶ ì§ìê¸ ì°¾ê¸°',
    description: 'ìµì  ì ë¶ ë³µì§ ì ì±ê³¼ ì§ìê¸ ì ë³´ë¥¼ íëì íì¸íì¸ì.',
    type: 'website',
  },
};

export const revalidate = 300;

async function getStats() {
  const totalPolicies = await prisma.policy.count({ where: { status: 'PUBLISHED' } });
  return { totalPolicies };
}

async function getPopularPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { viewCount: 'desc' },
    take: 5,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
  });
}

async function getExpiringPolicies() {
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED', deadline: { not: null } },
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
    take: 100,
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return policies
    .filter((p) => {
      const d = parseKoreanDate(p.deadline);
      return d && d.getTime() >= today.getTime();
    })
    .sort((a, b) => {
      const da = parseKoreanDate(a.deadline)!;
      const db = parseKoreanDate(b.deadline)!;
      return da.getTime() - db.getTime();
    })
    .slice(0, 5);
}
async function getLatestPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 6,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, publishedAt: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { policies: true } } },
  });
}


function parseKoreanDate(str: string | null): Date | null {
  if (!str) return null;
  const m = str.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return null;
  const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function getDday(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  if (deadline.includes('ìì') || deadline.includes('ìì')) return { text: 'ìì', urgent: false };
  const deadlineDate = parseKoreanDate(deadline);
  if (!deadlineDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return { text: 'D-DAY', urgent: true };
  return { text: `D-${diff}`, urgent: diff <= 7 };
}
function cleanTitle(title: string) {
  return title.replace(/^\[.*?\]\s*/, '');
}

function formatViewCount(count: number): string {
  if (count >= 10000) return (count / 10000).toFixed(1) + 'ë§';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'ì²';
  return count.toLocaleString();
}


export default async function HomePage() {
  const [stats, popularPolicies, expiringPolicies, latestPolicies, categories] = await Promise.all([
    getStats(),
    getPopularPolicies(),
    getExpiringPolicies(),
    getLatestPolicies(),
    getCategories(),
  ]);

  return (
    <div className="pb-20">
      {/* Compact Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">ëìê² ë§ë ì§ìê¸ ì°¾ê¸°</h1>
        <p className="text-blue-200 text-sm mb-4">{stats.totalPolicies.toLocaleString()}ê°ì ì ì± ì ë³´</p>
        <Link
          href="/welfare/search"
          className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 text-gray-400 text-sm shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          ì°¾ê³  ì¶ì ì ì±ì ê²ìí´ë³´ì¸ì
        </Link>
      </section>

      {/* Category Scroll */}
      <section className="px-4 py-4 border-b bg-white">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={'/welfare/categories/' + cat.slug}
              className="flex flex-col items-center gap-1.5 min-w-[56px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
                <CategoryIcon slug={cat.slug} size={28} />
              </div>
              <span className="text-[11px] text-gray-600 whitespace-nowrap">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Policies - gg24 style */}
      <section className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span className="text-lg">ð¥</span> íì¬ ì£¼ëª©ë°ë ì§ìê¸
          </h2>
          <Link href="/welfare/search?sort=popular" className="text-xs text-blue-600">ëë³´ê¸°</Link>
        </div>
        <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
          {popularPolicies.map((policy, idx) => {
            const dday = getDday(policy.deadline);
            return (
              <Link
                key={policy.id}
                href={'/welfare/' + encodeURIComponent(policy.slug)}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
              >
                <span className="text-sm font-bold text-blue-600 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">ð {formatViewCount(policy.viewCount || 0)}</span>
                    {dday && (
                      <span className={'text-[11px] font-semibold ' + (dday.urgent ? 'text-red-500' : 'text-orange-500')}>
                        {dday.text}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                  ì ì²­íê¸°
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Expiring Soon */}
      {expiringPolicies.length > 0 && (
        <section className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span className="text-lg">â°</span> ê³§ ë§ê°ëë ì§ìê¸
            </h2>
            <Link href="/welfare/search?sort=deadline" className="text-xs text-blue-600">ëë³´ê¸°</Link>
          </div>
          <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
            {expiringPolicies.map((policy) => {
              const dday = getDday(policy.deadline);
              return (
                <Link
                  key={policy.id}
                  href={'/welfare/' + encodeURIComponent(policy.slug)}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">ð {formatViewCount(policy.viewCount || 0)}</span>
                      <span className="text-[11px] text-gray-400">{policy.geoRegion || 'ì êµ­'}</span>
                    </div>
                  </div>
                  {dday && (
                    <span className={'text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ' + (dday.urgent ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600')}>
                      {dday.text}
                    </span>
                  )}
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    ì ì²­íê¸°
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest Policies - Card Grid */}
      <section className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span className="text-lg">ð</span> ìµì  ì§ìê¸
          </h2>
          <Link href="/welfare/search?sort=latest" className="text-xs text-blue-600">ëë³´ê¸°</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {latestPolicies.map((policy) => {
            const dday = getDday(policy.deadline);
            return (
              <Link
                key={policy.id}
                href={'/welfare/' + encodeURIComponent(policy.slug)}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {policy.category?.name || 'ë³µì§'}
                  </span>
                  {policy.geoRegion && (
                    <span className="text-[11px] text-gray-400">ð {policy.geoRegion}</span>
                  )}
                  {dday && (
                    <span className={'text-[11px] font-semibold ml-auto ' + (dday.urgent ? 'text-red-500' : 'text-orange-500')}>
                      {dday.text}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5">
                  {cleanTitle(policy.title)}
                </h3>
                {policy.excerpt && (
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">{policy.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>ð {formatViewCount(policy.viewCount || 0)}</span>
                  {policy.publishedAt && (
                    <span>{new Date(policy.publishedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Access Banner */}
      <section className="px-4 pt-2 pb-4">
        <Link
          href="/recommend"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">ëìê² ë§ë ì ì± ì°¾ê¸°</h3>
              <p className="text-xs text-gray-500">ê°ë¨í ì ë³´ ìë ¥ì¼ë¡ ë§ì¶¤ ì¶ì²ë°ê¸°</p>
            </div>
            <span className="text-2xl">ð¯</span>
          </div>
        </Link>
      </section>
    </div>
  );
}
