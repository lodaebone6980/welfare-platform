import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: '카테고리별 정책',
  description: '생활안정, 주거, 교육, 고용, 건강 등 분야별 정부 복지 정책을 찾아보세요.',
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: 'asc' },
    include: { _count: { select: { policies: true } } },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-gray-900">📋 카테고리별 정책</h1>
          <p className="text-sm text-gray-500 mt-1">분야별로 나에게 맞는 정책을 찾아보세요</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map(cat => (
            <Link key={cat.slug} href={`/welfare/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group">
              <span className="text-4xl group-hover:scale-110 transition-transform">{cat.icon || '📌'}</span>
              <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
              <span className="text-xs text-gray-400">{cat._count.policies}개 정책</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
