import { prisma } from '@/lib/prisma'
import CategoryList from './_components/CategoryList'

export const dynamic = 'force-dynamic'

async function getCategories() {
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { policies: true } } },
    })
    return rows
  } catch {
    return []
  }
}

export default async function CategoryManagePage() {
  const categories = await getCategories()
  const totalPolicies = categories.reduce((s, c: any) => s + (c._count?.policies ?? 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1400px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800">카테고리 관리</h1>
        <p className="text-xs text-gray-500 mt-1">
          정책이 노출되는 카테고리·태그 체계를 관리합니다. 총 {categories.length}개 카테고리 · {totalPolicies.toLocaleString()}개 정책 연결.
        </p>
      </div>

      <CategoryList initial={categories as any} />

      <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
        <p className="font-medium mb-1">💡 확장 예정 (Phase 3)</p>
        <ul className="list-disc pl-5 space-y-0.5 text-blue-600">
          <li>카테고리별 SEO 메타태그 (metaTitle / metaDescription)</li>
          <li>대분류 / 중분류 트리 구조 (parentId 추가)</li>
          <li>카테고리 대표 이미지 · 설명문</li>
          <li>카테고리별 클릭 · 유입 통계</li>
        </ul>
      </div>
    </div>
  )
}
