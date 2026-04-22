import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import CategoryIcon from '@/components/ui/CategoryIcon';
import { SITE_NAME, SITE_DESC } from '@/lib/env';
import { policyHref } from '@/lib/categories';

export const metadata: Metadata = {
  title: `${SITE_NAME} - 나에게 맞는 정부 지원금 찾기`,
  description: SITE_DESC,
  openGraph: {
    title: `${SITE_NAME} - 나에게 맞는 정부 지원금 찾기`,
    description: '최신 정부 복지 정책과 지원금 정보를 한눈에 확인하세요.',
    type: 'website',
  },
};

export const revalidate = 300;

// 중간점(·) 공백 치환 — 카테고리 표시 전용 헬퍼
function displayCategoryName(name?: string | null): string {
  return (name || '').replace(/·/g, ' ');
}

async function getStats() {
  const totalPolicies = await prisma.policy.count({ where: { status: 'PUBLISHED' } });
  return { totalPolicies };
}

/** 조회수 기준 인기 지원금 (gg24 스타일) */
async function getPopularPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: 6,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
  });
}

async function getFeaturedPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED', featured: true },
    orderBy: { featuredOrder: 'asc' },
    take: 6,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
  });
}

async function getExpiringPolicies() {
  // DB에서 1차로 deadline 존재하는 것 중 신규순 30건만 가져와 JS로 파싱·정렬·필터 (100→30으로 축소)
  // (deadline 컬럼이 문자열 형식이라 DB-level 날짜 비교가 어려워 앱 레이어 필터 불가피.
  //  캐시 revalidate=300 으로 비용 분산)
  const policies = await prisma.policy.findMany({
    where: {
      status: 'PUBLISHED',
      deadline: { not: null },
      NOT: [
        { deadline: '' },
        { deadline: { contains: '상시' } },
        { deadline: { contains: '수시' } },
        { deadline: { contains: '연중' } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
    take: 30,
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

/** 상시신청 지원금 — deadline이 없거나 '상시/수시/연중' 포함 */
async function getAlwaysOpenPolicies() {
  const policies = await prisma.policy.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { deadline: null },
        { deadline: '' },
        { deadline: { contains: '상시' } },
        { deadline: { contains: '수시' } },
        { deadline: { contains: '연중' } },
      ],
    },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
    take: 5,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      geoRegion: true, viewCount: true, deadline: true,
      category: { select: { name: true, slug: true, icon: true } },
    },
  });
  return policies;
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
  if (deadline.includes('상시') || deadline.includes('수시')) return { text: '상시', urgent: false };
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

export default async function HomePage() {
  const [stats, popularPolicies, expiringPolicies, alwaysOpenPolicies, featuredPolicies, latestPolicies, categories] = await Promise.all([
    getStats(),
    getPopularPolicies(),
    getExpiringPolicies(),
    getAlwaysOpenPolicies(),
    getFeaturedPolicies(),
    getLatestPolicies(),
    getCategories(),
  ]);

  return (
    <div className="pb-20">
      {/* Compact Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6">
        <h1 className="text-white text-xl font-bold mb-1">나에게 맞는 지원금 찾기</h1>
        <p className="text-blue-200 text-sm mb-4">{stats.totalPolicies.toLocaleString()}개의 정책 정보</p>
        <Link
          href="/welfare/search"
          className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 text-gray-400 text-sm shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          찾고 싶은 정책을 검색해보세요
        </Link>
      </section>

      {/* 🔥 인기 지원금 (조회수 TOP) — gg24 스타일, 상단 배치 */}
      <section className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span className="text-lg">🔥</span> 지금 가장 많이 보는 지원금
          </h2>
          <Link href="/welfare/search?sort=popular" className="text-xs text-blue-600">더보기</Link>
        </div>
        <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
          {popularPolicies.map((policy, idx) => {
            const dday = getDday(policy.deadline);
            return (
              <Link
                key={policy.id}
                href={policyHref({ categorySlug: policy.category?.slug, slug: policy.slug })}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
              >
                <span className="text-sm font-bold text-red-500 w-5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {policy.category && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        {displayCategoryName(policy.category.name)}
                      </span>
                    )}
                    {dday && (
                      <span className={'text-[11px] font-semibold ' + (dday.urgent ? 'text-red-500' : 'text-orange-500')}>
                        {dday.text}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                  자세히
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ⏰ 곧 마감되는 지원금 — 상단 배치 */}
      {expiringPolicies.length > 0 && (
        <section className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span className="text-lg">⏰</span> 곧 마감되는 지원금
            </h2>
            <Link href="/welfare/search?sort=deadline" className="text-xs text-blue-600">더보기</Link>
          </div>
          <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
            {expiringPolicies.map((policy) => {
              const dday = getDday(policy.deadline);
              return (
                <Link
                  key={policy.id}
                  href={policyHref({ categorySlug: policy.category?.slug, slug: policy.slug })}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {policy.category && (
                        <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {displayCategoryName(policy.category.name)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">{policy.geoRegion || '전국'}</span>
                    </div>
                  </div>
                  {dday && (
                    <span className={'text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ' + (dday.urgent ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600')}>
                      {dday.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 🔁 상시신청 지원금 — 마감 걱정 없이 언제든 신청 가능 */}
      {alwaysOpenPolicies.length > 0 && (
        <section className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span className="text-lg">🔁</span> 상시신청 지원금
            </h2>
            <Link href="/welfare/search?apply=always" className="text-xs text-blue-600">더보기</Link>
          </div>
          <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
            {alwaysOpenPolicies.map((policy) => (
              <Link
                key={policy.id}
                href={policyHref({ categorySlug: policy.category?.slug, slug: policy.slug })}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {policy.category && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        {displayCategoryName(policy.category.name)}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">{policy.geoRegion || '전국'}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap bg-emerald-50 text-emerald-700">
                  🔁 상시
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Category Scroll — 영어 slug URL */}
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
              <span className="text-[11px] text-gray-600 whitespace-nowrap">
                {displayCategoryName(cat.name)}
              </span>
              <span className="text-[9px] text-gray-400">{cat._count.policies}건</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 py-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">맞춤 정책을 설정해보세요</p>
            <p className="text-xs text-gray-500 mt-0.5">나에게 딱 맞는 정책을 찾아드려요</p>
          </div>
          <Link href="/welfare/search" className="text-xs font-medium text-white bg-blue-500 px-3 py-1.5 rounded-lg whitespace-nowrap">
            설정하기
          </Link>
        </div>
      </section>

      {/* ⭐ 에디터 추천 지원금 */}
      {featuredPolicies.length > 0 && (
        <section className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <span className="text-lg">⭐</span> 에디터 추천
            </h2>
            <Link href="/welfare/search?featured=1" className="text-xs text-blue-600">더보기</Link>
          </div>
          <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
            {featuredPolicies.map((policy, idx) => {
              const dday = getDday(policy.deadline);
              return (
                <Link
                  key={policy.id}
                  href={policyHref({ categorySlug: policy.category?.slug, slug: policy.slug })}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                >
                  <span className="text-sm font-bold text-blue-600 w-5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cleanTitle(policy.title)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {policy.category && (
                        <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                          {displayCategoryName(policy.category.name)}
                        </span>
                      )}
                      {dday && (
                        <span className={'text-[11px] font-semibold ' + (dday.urgent ? 'text-red-500' : 'text-orange-500')}>
                          {dday.text}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    자세히
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 📋 최신 지원금 — Card Grid */}
      <section className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <span className="text-lg">📋</span> 최신 지원금
          </h2>
          <Link href="/welfare/search?sort=latest" className="text-xs text-blue-600">더보기</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {latestPolicies.map((policy) => {
            const dday = getDday(policy.deadline);
            return (
              <Link
                key={policy.id}
                href={policyHref({ categorySlug: policy.category?.slug, slug: policy.slug })}
                className="block bg-white rounded-xl border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {displayCategoryName(policy.category?.name) || '복지'}
                  </span>
                  {policy.geoRegion && (
                    <span className="text-[11px] text-gray-400">📍 {policy.geoRegion}</span>
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
              <h3 className="text-sm font-bold text-gray-900 mb-1">나에게 맞는 정책 찾기</h3>
              <p className="text-xs text-gray-500">간단한 정보 입력으로 맞춤 추천받기</p>
            </div>
            <span className="text-2xl">🎯</span>
          </div>
        </Link>
      </section>
    </div>
  );
}
