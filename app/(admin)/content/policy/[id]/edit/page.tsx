import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PolicyFormClient from '../../PolicyFormClient'

export const dynamic = 'force-dynamic'

export default async function EditPolicyPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id)) notFound()

  const [policy, categories] = await Promise.all([
    prisma.policy.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, slug: true },
    }),
  ])
  if (!policy) notFound()

  return <PolicyFormClient mode="edit" initialPolicy={JSON.parse(JSON.stringify(policy))} categories={categories} />
}
