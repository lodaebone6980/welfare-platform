import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PolicyCard from '@/components/home/PolicyCard';
import CategoryIcon from '@/components/ui/CategoryIcon';

export const metadata: Metadata = {
  title: '정책지금 - 나에게 맞는 정부 지원금 찾기',
  description: '2024년 최신 정부 복지 정책, 지원금, 보조금 정보를 한눈에! 생활안정, 주거, 교육, 고용, 건강 등 맞춤형 복지 서비스를 찾아보세요.',
  openGraph: {
    title: '정책지금 - 나에게 맞는 정부 지원금 찾기',
    description: '최신 정부 복지 정책과 지원금 정보를 한눈에 확인하세요.',
    type: 'website',
  },
};

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

async function getStats() {
  const totalPolicies = await prisma.policy.count({ where: { status: 'PUBLISHED' } });
  const totalCategories = await prisma.category.count();
  return { totalPolicies, totalCategories };
}

async function getLatestPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 12,
    include: { category: true },
  });
}

async function getPopularPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { viewCount: 'desc' },
    take: 6,
    include: { category: true },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { policies: true } } },
  });
}

export const revalidate = 60; // ISR: 1시간

export default async function HomePage() {
  const [stats, latestPolicies, popularPolicies, categories] = await Promise.all([
    getStats(),
    getLatestPolicies(),
    getPopularPolicies(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-purple-300/20 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-20">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            나에게 맞는<br />
            <span className="text-yellow-300">정부 지원금</span> 찾기
          </h1>
          <p className="mt-3 text-blue-100 text-sm md:text-lg max-w-xl">
            {stats.totalPolicies.toLocaleString()}개의 복지 정책 정보를 한눈에 확인하세요
          </p>
          <form action="/welfare/search" method="GET" className="mt-6 relative max-w-xl">
            <input
              type="text"
              name="q"
              placeholder="찾고 싶은 정책을 검색해보세요..."
              className="w-full h-12 md:h-14 pl-12 pr-4 rounded-2xl bg-white/95 text-gray-900 placeholder-gray-400 text-sm md:text-base shadow-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            {['청년', '신혼부부', '저소득', '장애인', '어르신'].map(tag => (
              <Link key={tag} href={`/welfare/search?q=${tag}`}
                className="px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs hover:bg-white/25 transition-colors">
                # {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      {categories.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3 bg-white rounded-2xl shadow-lg p-4">
            {categories.map(cat => (
              <Link key={cat.slug} href={`/welfare/categories/${cat.slug}`}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <CategoryIcon slug={cat.slug} size={32} withBg />
                <span className="text-[10px] md:text-xs text-gray-600 text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular Policies */}
      {popularPolicies.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">🔥 인기 정책</h2>
            <Link href="/welfare/search?sort=popular" className="text-sm text-blue-600 hover:underline">전체보기</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularPolicies.map(policy => (
              <PolicyCard key={policy.slug} policy={policy} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Policies */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">📋 최신 정책</h2>
          <Link href="/welfare/search?sort=latest" className="text-sm text-blue-600 hover:underline">전체보기</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {latestPolicies.map(policy => (
            <PolicyCard key={policy.slug} policy={policy} />
          ))}
        </div>
      </section>

      {/* Regional Links */}
      <section className="max-w-5xl mx-auto px-4 mt-10 mb-8">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">📍 지역별 정책</h2>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map(region => (
            <Link key={region} href={`/welfare/search?region=${region}`}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
              {region}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-white font-bold text-lg">정책지금 💰</p>
              <p className="text-sm mt-1">정부 복지 정책 정보 플랫폼</p>
            </div>
            <div className="text-xs space-y-1">
              <p>본 서비스는 공공데이터포털(data.go.kr) 제공 데이터를 활용합니다.</p>
              <p>&copy; {new Date().getFullYear()} 정책지금. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
