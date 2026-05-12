import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const deny = await requireAdmin()
  if (deny) return deny

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [posts, pending, total, today] = await Promise.all([
    prisma.threadsPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        policy: {
          select: { id: true, title: true, slug: true },
        },
      },
    }),
    prisma.threadsPost.count({ where: { status: 'draft' } }),
    prisma.threadsPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.threadsPost.count({ where: { publishedAt: { gte: startOfDay } } }),
  ])

  return NextResponse.json({
    posts,
    pending,
    total,
    today,
    configured: Boolean(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN),
  })
}
