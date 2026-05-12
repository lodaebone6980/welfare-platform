import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  classifyMedium,
  classifySource,
  normalizePath,
} from '@/lib/tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set([
  'apply_click',
  'official_source_click',
  'share_click',
  'recommend_start',
  'login_start',
])

const BLOCKED_PATH_PREFIXES = [
  '/api/',
  '/_next/',
  '/dashboard',
  '/content/',
  '/api-status',
  '/traffic',
  '/trending',
  '/marketing/',
]

function shouldIgnore(path: string): boolean {
  return BLOCKED_PATH_PREFIXES.some(p => path === p || path.startsWith(p))
}

function cleanMetadata(input: unknown): Record<string, string | number | boolean | null> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const out: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.-]{1,40}$/.test(key)) continue
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      out[key] = typeof value === 'string' ? value.slice(0, 300) : value as any
    }
  }
  return Object.keys(out).length ? out : null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      name,
      path: rawPath,
      fullPath,
      title,
      referrer,
      utm = {},
      sessionId,
      visitorId,
      metadata,
    } = body as {
      name?: string
      path?: string
      fullPath?: string
      title?: string
      referrer?: string
      utm?: Record<string, string | undefined>
      sessionId?: string
      visitorId?: string
      metadata?: unknown
    }

    if (!name || !ALLOWED_EVENTS.has(name)) {
      return NextResponse.json({ ok: false, error: 'EVENT_NOT_ALLOWED' }, { status: 400 })
    }

    const path = normalizePath(rawPath || '/')
    if (shouldIgnore(path)) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const host = req.headers.get('host') || ''
    const source = classifySource({
      referrer,
      utmSource: utm.utm_source,
      currentHost: host.split(':')[0],
    })
    const medium = utm.utm_medium || classifyMedium(source)

    await prisma.trackingEvent.create({
      data: {
        name,
        path,
        fullPath: fullPath || null,
        title: title || null,
        source,
        medium: medium || null,
        sessionId: sessionId || 'unknown',
        visitorId: visitorId || null,
        userAgent: (req.headers.get('user-agent') || '').slice(0, 500),
        utmSource: utm.utm_source || null,
        utmMedium: utm.utm_medium || null,
        utmCampaign: utm.utm_campaign || null,
        utmTerm: utm.utm_term || null,
        utmContent: utm.utm_content || null,
        metadata: cleanMetadata(metadata),
      } as any,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track/event] error:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, method: 'POST expected' })
}
