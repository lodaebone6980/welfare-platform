import { prisma } from '@/lib/prisma'
import PolicyFormClient from '../PolicyFormClient'

export const dynamic = 'force-dynamic'

export default async function NewPolicyPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, slug: true },
  })

  return <PolicyFormClient mode="create" categories={categories} />
}
