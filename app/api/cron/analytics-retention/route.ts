import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cronUnauthorized, isCronAuthorized } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function retentionDays() {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS || '180')
  return Number.isFinite(raw) ? Math.max(30, Math.floor(raw)) : 180
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return cronUnauthorized()

  const days = retentionDays()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const prismaAny = prisma as any

  const pageViews = await prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff } } })
  let eventCount = 0
  try {
    const events = await prismaAny.trackingEvent.deleteMany({ where: { createdAt: { lt: cutoff } } })
    eventCount = events.count
  } catch {
    eventCount = 0
  }

  return NextResponse.json({
    ok: true,
    retentionDays: days,
    cutoff,
    deleted: {
      pageViews: pageViews.count,
      events: eventCount,
    },
  })
}

export async function GET(req: Request) {
  return POST(req)
}
