import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function slugify(s: string): string {
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\uAC00-\uD7A3\s-]/g, '') // ASCII word + 한글 + 공백/하이픈만 허용
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80)
}

export async function GET() {
  try {
    const cats = await prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { policies: true } } },
    })
    return NextResponse.json({ ok: true, items: cats })
  } catch (err) {
    console.error('[admin/categories GET]', err)
    return NextResponse.json({ ok: false, items: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body.name ?? '').trim()
    const rawSlug = String(body.slug ?? '').trim()
    const icon = body.icon ? String(body.icon).slice(0, 32) : null
    const displayOrder = Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0
    if (!name) {
      return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })
    }
    const slug = rawSlug || slugify(name)
    const created = await prisma.category.create({
      data: { name, slug, icon, displayOrder },
    })
    return NextResponse.json({ ok: true, item: created })
  } catch (err: any) {
    console.error('[admin/categories POST]', err)
    const msg = err?.code === 'P2002' ? '이미 존재하는 이름 또는 slug 입니다.' : 'create failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}
