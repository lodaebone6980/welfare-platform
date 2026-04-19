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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await assertAdmin(); if (deny) return deny
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))

  // Reorder: moveBy = -1 (up) / +1 (down) by swapping displayOrder
  if (typeof body?.moveBy === 'number' && body.moveBy !== 0) {
    const target = await prisma.category.findUnique({ where: { id } })
    if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const neighbors = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    })
    const idx = neighbors.findIndex(c => c.id === id)
    const swapIdx = idx + body.moveBy
    if (swapIdx < 0 || swapIdx >= neighbors.length) {
      return NextResponse.json({ ok: true, noop: true })
    }
    const other = neighbors[swapIdx]
    await prisma.$transaction([
      prisma.category.update({ where: { id: target.id }, data: { displayOrder: other.displayOrder } }),
      prisma.category.update({ where: { id: other.id }, data: { displayOrder: target.displayOrder } }),
    ])
    // Normalize if both had same displayOrder (rare edge case)
    if (other.displayOrder === target.displayOrder) {
      const all = await prisma.category.findMany({ orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }] })
      await prisma.$transaction(all.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { displayOrder: i } })))
    }
    return NextResponse.json({ ok: true })
  }

  const data: any = {}
  if (typeof body?.name === 'string') data.name = body.name.trim()
  if (typeof body?.slug === 'string') data.slug = body.slug.trim()
  if (typeof body?.icon === 'string') data.icon = body.icon || null
  if (Number.isFinite(Number(body?.displayOrder))) data.displayOrder = Number(body.displayOrder)

  try {
    const updated = await prisma.category.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'update failed' }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const deny = await assertAdmin(); if (deny) return deny
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const count = await prisma.policy.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json({ error: `${count} policies linked; cannot delete` }, { status: 400 })
  }
  try {
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'delete failed' }, { status: 400 })
  }
}
