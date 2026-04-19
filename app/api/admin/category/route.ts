import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function assertAdmin() {
  const session = await getServerSession(authOptions as any)
  const role = (session as any)?.user?.role
  if (role !== 'ADMIN' && role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const rows = await prisma.category.findMany({
    orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { policies: true } } },
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const deny = await assertAdmin(); if (deny) return deny
  const body = await req.json().catch(() => ({}))
  const { name, slug, icon, displayOrder } = body ?? {}
  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug required' }, { status: 400 })
  }
  try {
    const created = await prisma.category.create({
      data: {
        name: String(name).trim(),
        slug: String(slug).trim(),
        icon: icon ? String(icon) : null,
        displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'create failed' }, { status: 400 })
  }
}
