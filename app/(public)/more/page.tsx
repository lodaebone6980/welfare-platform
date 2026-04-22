import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: '더보기',
};

export const revalidate = 3600;

export default async function MorePage() {
  const stats = await prisma.policy.count({ where: { status: 'PUBLISHED' } });

  const menuItems = [
    { href: '/welfare/search', label: '전체 정책 검색', icon: '🔍', desc: '키워드로 정책 찾기' },
    { href: '/welfare/categories', label: '카테고리별 보기', icon: '📋', desc: '분야별 정책 탐색' },
    { href: '/welfare/search?sort=popular', label: '인기 정책', icon: '🔥', desc: '가장 많이 본 정책' },
    { href: '/welfare/search?sort=latest', label: '최신 정책', icon: '🆕', desc: '최근 등록된 정책' },
  ];

  const regions = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-gray-900">더보기</h1>
          <p className="text-sm text-gray-500 mt-1">총 {stats.toLocaleString()}개의 정책 정보 제공 중</p>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 mt-4 space-y-4">
        {/* Menu Items */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {menuItems.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <span className="text-gray-300">→</span>
            </Link>
          ))}
        </div>

        {/* Quick Region Links */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">📍 주요 지역</h2>
          <div className="flex flex-wrap gap-2">
            {regions.map(region => (
              <Link key={region} href={`/welfare/search?region=${region}`}
                className="px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                {region}
              </Link>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">국민자료실 정보</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            국민자료실은 공공데이터포털(data.go.kr)에서 제공하는 복지 서비스 정보를 활용하여
            국민들이 쉽게 정부 지원 정책을 찾을 수 있도록 돕는 서비스입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
