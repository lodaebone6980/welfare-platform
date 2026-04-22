import { prisma } from '@/lib/prisma'
import CategoryClient from './CategoryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CategoryRow = {
  id: number
  name: string
  slug: string
  icon: string | null
  displayOrder: number
  _count?: { policies: number }
}

async function getCategories(): Promise<CategoryRow[]> {
  try {
    return (await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { policies: true } } },
    })) as CategoryRow[]
  } catch {
    return []
  }
}

export default async function CategoryPage() {
  const categories = await getCategories()
  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">카테고리 관리</h1>
        <span className="text-[10px] text-gray-400">정책 분류 · 순서 · 슬러그 설정</span>
      </div>
      <CategoryClient
        initial={categories.map((c: CategoryRow) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          displayOrder: c.displayOrder,
          policyCount: c._count?.policies ?? 0,
        }))}
      />
    </div>
  )
}
