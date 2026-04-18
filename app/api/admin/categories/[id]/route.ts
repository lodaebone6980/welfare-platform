import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const data: any = {}
    if (typeof body.name === 'string') data.name = body.name.trim()
    if (typeof body.slug === 'string') data.slug = body.slug.trim()
    if (typeof body.icon === 'string' || body.icon === null) data.icon = body.icon
    if (body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))) {
      data.displayOrder = Number(body.displayOrder)
    }
    const updated = await prisma.category.update({ where: { id }, data })
    return NextResponse.json({ ok: true, item: updated })
  } catch (err: any) {
    console.error('[admin/categories PATCH]', err)
    const msg = err?.code === 'P2002' ? '중복된 이름/slug' : 'update failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 })
  }
  try {
    // 연결된 정책이 있으면 삭제 차단
    const count = await prisma.policy.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { ok: false, error: `연결된 정책이 ${count}건 있어 삭제할 수 없습니다.` },
        { status: 400 },
      )
    }
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/categories DELETE]', err)
    return NextResponse.json({ ok: false, error: 'delete failed' }, { status: 400 })
  }
}
