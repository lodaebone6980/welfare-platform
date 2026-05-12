import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const deny = await requireAdmin()
  if (deny) return deny

  const url = new URL(req.url)
  const limitRaw = Number(url.searchParams.get('limit') ?? '20')
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(100, Math.floor(limitRaw)))
    : 20

  try {
    const logs = await prisma.indexingLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        triggerType: true,
        engine: true,
        urlCount: true,
        sampleUrls: true,
        status: true,
        httpStatus: true,
        errorMsg: true,
        durationMs: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ logs })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
