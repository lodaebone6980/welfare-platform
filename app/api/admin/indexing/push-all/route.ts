import { NextResponse } from 'next/server'
import { pushAll } from '@/lib/indexing/push'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const deny = await requireAdmin()
  if (deny) return deny

  const body = await req.json().catch(() => ({})) as {
    sinceDays?: number
    limit?: number
    urls?: string[]
  }

  try {
    const result = await pushAll({
      trigger: 'MANUAL_ALL',
      sinceDays: body.sinceDays,
      limit: body.limit,
      urls: body.urls,
    })
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
