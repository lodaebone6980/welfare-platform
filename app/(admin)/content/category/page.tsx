import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import CategoryClient from './CategoryClient'

// 카테고리 편집은 빈도가 낮으므로 5분 캐시. 편집 시 revalidatePath 수동 호출로 무효화.
export const dynamic = 'force-dynamic'
export const revalidate = 300

type CategoryRow = {
  id: number
  name: string
  slug: string
  icon: string | null
  displayOrder: number
  _count?: { policies: number }
}

const getCategories = unstable_cache(
  async (): Promise<CategoryRow[]> => {
    try {
      return (await prisma.category.findMany({
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { policies: true } } },
      })) as CategoryRow[]
    } catch {
      return []
    }
  },
  ['admin-categories-v1'],
  { revalidate: 300, tags: ['categories'] },
)

async function CategoryList() {
  const categories = await getCategories()
  return (
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
  )
}

function CategoryListSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-50 border border-gray-100 rounded-lg" />
      ))}
    </div>
  )
}

export default function CategoryPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-medium text-gray-800">카테고리 관리</h1>
        <span className="text-[10px] text-gray-400">정책 분류 · 순서 · 슬러그 설정 · 5분 캐시</span>
      </div>
      <Suspense fallback={<CategoryListSkeleton />}>
        <CategoryList />
      </Suspense>
    </div>
  )
}
