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

const VALID_SCHEDULES = new Set(['', '15m', '30m', '1h', '2h', '6h', '12h', 'daily', '1d', 'weekly'])

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const deny = await assertAdmin(); if (deny) return deny
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const data: any = {}

  if (typeof body?.status === 'string' && ['active', 'paused', 'disabled'].includes(body.status)) {
    data.status = body.status
  }
  if (typeof body?.schedule === 'string') {
    const s = body.schedule.trim().toLowerCase()
    if (!VALID_SCHEDULES.has(s) && !/^[0-9*\/,\-\s]+$/.test(s)) {
      return NextResponse.json({ error: 'invalid schedule' }, { status: 400 })
    }
    data.schedule = s || null
  }
  if (typeof body?.autoPublish === 'boolean') {
    data.autoPublish = body.autoPublish
  }
  if (typeof body?.name === 'string' && body.name.trim()) {
    data.name = body.name.trim()
  }
  if (typeof body?.url === 'string') {
    data.url = body.url.trim() || null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 })
  }

  try {
    const updated = await (prisma as any).apiSource.update({ where: { id }, data })
    return NextResponse.json({ ok: true, source: updated })
  } catch (e: any) {
    // Handle missing columns gracefully (before migration is run)
    if (/column.*does not exist|unknown.*field/i.test(String(e?.message ?? ''))) {
      return NextResponse.json(
        { error: 'migration required', hint: 'Run prisma/migrations/20260419_api_schedule/migration.sql in Supabase SQL editor.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: e?.message ?? 'update failed' }, { status: 400 })
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  try {
    const row = await (prisma as any).apiSource.findUnique({ where: { id } })
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(row)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'lookup failed' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const deny = await assertAdmin(); if (deny) return deny
  const id = Number(params.id)
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 })
  try {
    await (prisma as any).apiSource.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (/Record to delete does not exist/i.test(String(e?.message ?? ''))) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: false, error: e?.message ?? 'delete failed' }, { status: 400 })
  }
}
