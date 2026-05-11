import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cronUnauthorized, isCronAuthorized } from '@/lib/server-auth'

// Vercel Cron endpoint: triggered by the schedule in vercel.json.
// Vercel sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is configured.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function isDue(schedule: string | null | undefined, lastRun: Date | null | undefined, now = new Date()): boolean {
  if (!schedule) return false
  if (!lastRun) return true
  const elapsedMin = (now.getTime() - new Date(lastRun).getTime()) / 60000

  // Interval labels
  const intervalMap: Record<string, number> = {
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '6h': 360,
    '12h': 720,
    'daily': 60 * 24,
    '1d': 60 * 24,
    'weekly': 60 * 24 * 7,
  }
  const interval = intervalMap[schedule.trim().toLowerCase()]
  if (interval) return elapsedMin >= interval

  // Cron-like: treat as hourly floor (basic fallback)
  if (/^\s*\d/.test(schedule)) return elapsedMin >= 60
  return false
}

async function runCollection(sourceName: string): Promise<{ ok: boolean; error?: string }> {
  // Delegate to the existing trigger endpoint if present; otherwise direct dispatch.
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'http://localhost:3000'
  const origin = base.startsWith('http') ? base : `https://${base}`
  const slug = sourceName === '복지로' ? 'bokjiro' : sourceName.toLowerCase()
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (process.env.CRON_SECRET) {
    headers.authorization = `Bearer ${process.env.CRON_SECRET}`
  }

  try {
    const res = await fetch(`${origin}/api/admin/collect/${slug}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ triggeredBy: 'cron' }),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'unknown' }
  }
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return cronUnauthorized()

  const started = Date.now()
  let sources: any[] = []
  try {
    sources = await (prisma as any).apiSource.findMany({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'apiSource table missing', detail: e?.message }, { status: 500 })
  }

  const results: Array<{ id: number; name: string; action: string; error?: string }> = []
  for (const s of sources) {
    const due = isDue(s.schedule, s.lastScheduledRun)
    if (!due) {
      results.push({ id: s.id, name: s.name, action: 'skip' })
      continue
    }
    const r = await runCollection(s.name)
    results.push({ id: s.id, name: s.name, action: r.ok ? 'triggered' : 'failed', error: r.error })
    try {
      await (prisma as any).apiSource.update({
        where: { id: s.id },
        data: { lastScheduledRun: new Date() },
      })
    } catch { /* ignore if column missing */ }
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    ran: results.filter(r => r.action === 'triggered').length,
    skipped: results.filter(r => r.action === 'skip').length,
    failed: results.filter(r => r.action === 'failed').length,
    results,
  })
}
