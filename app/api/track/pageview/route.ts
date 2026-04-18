import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  classifySource,
  classifyMedium,
  parseUserAgent,
  classifyPlatform,
  normalizePath,
} from '@/lib/tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 관리자/API/내부 경로는 집계하지 않음
const BLOCKED_PATH_PREFIXES = [
  '/api/',
  '/_next/',
  '/dashboard',
  '/content/',
  '/api-status',
  '/traffic',
  '/trending',
  '/marketing',
]

function shouldIgnore(path: string): boolean {
  return BLOCKED_PATH_PREFIXES.some(p => path === p || path.startsWith(p))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      path: rawPath,
      fullPath,
      title,
      referrer,
      utm = {},
      srcParam,
      sessionId,
      visitorId,
    } = body as {
      path?: string
      fullPath?: string
      title?: string
      referrer?: string
      utm?: Record<string, string | undefined>
      srcParam?: string
      sessionId?: string
      visitorId?: string
    }

    const path = normalizePath(rawPath || '/')
    if (shouldIgnore(path)) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const ua = req.headers.get('user-agent') || ''
    const { device, os, browser } = parseUserAgent(ua)
    const platform = classifyPlatform({ srcParam, userAgent: ua, os })

    const host = req.headers.get('host') || ''
    const source = classifySource({
      referrer,
      utmSource: utm.utm_source,
      currentHost: host.split(':')[0],
    })
    const medium = utm.utm_medium || classifyMedium(source)

    // 국가 코드: Vercel 배포 시 x-vercel-ip-country 헤더 자동 부여
    const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null
    const region = req.headers.get('x-vercel-ip-country-region') || null

    await prisma.pageView.create({
      data: {
        path,
        fullPath: fullPath || null,
        title: title || null,
        referrer: referrer || null,
        source,
        medium: medium || null,
        device,
        platform,
        os: os || null,
        browser: browser || null,
        country: country || null,
        region: region || null,
        sessionId: sessionId || 'unknown',
        visitorId: visitorId || null,
        userAgent: ua.slice(0, 500),
        utmSource: utm.utm_source || null,
        utmMedium: utm.utm_medium || null,
        utmCampaign: utm.utm_campaign || null,
        utmTerm: utm.utm_term || null,
        utmContent: utm.utm_content || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track/pageview] error:', err)
    // 수집 실패가 페이지에 영향을 주지 않도록 200 반환(조용히 실패)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, method: 'POST expected' })
}
