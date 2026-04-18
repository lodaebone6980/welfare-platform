import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/env'

/**
 * IndexNow 공통 엔드포인트.
 * - POST /api/indexnow  body: { urls: string[] }  → Bing/Yandex/Naver(예정) 즉시 색인 요청
 * - GET  /api/indexnow?url=https://... → 단건 빠른 호출
 *
 * 운영 가이드:
 * 1) Bing Webmaster → "IndexNow" 메뉴에서 API Key 발급
 * 2) 발급받은 key 를 public/{KEY}.txt 로 배포 (내용도 KEY 문자열)
 * 3) .env 에 INDEXNOW_KEY 등록
 * 4) 크롤러/관리자 발행 시 이 엔드포인트를 호출
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  // Yandex 도 동일 프로토콜 지원
  // 'https://yandex.com/indexnow',
]

function normalizeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

async function submitBatch(urls: string[], key: string, keyLocation?: string) {
  const host = normalizeHost(SITE_URL)
  if (!host) return { ok: false, error: 'invalid SITE_URL' }

  const body = {
    host,
    key,
    ...(keyLocation ? { keyLocation } : {}),
    urlList: urls,
  }

  const results = await Promise.allSettled(
    INDEXNOW_ENDPOINTS.map((ep) =>
      fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      }).then(async (r) => ({
        endpoint: ep,
        status: r.status,
        text: r.status >= 400 ? await r.text().catch(() => '') : '',
      }))
    )
  )

  return {
    ok: true,
    submitted: urls.length,
    results: results.map((r) =>
      r.status === 'fulfilled' ? r.value : { error: String(r.reason) }
    ),
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = process.env.INDEXNOW_KEY
    if (!key) {
      return NextResponse.json(
        { ok: false, error: 'INDEXNOW_KEY not set' },
        { status: 500 }
      )
    }
    const keyLocation = process.env.INDEXNOW_KEY_LOCATION // optional
    const body = await req.json().catch(() => ({}))
    const raw = Array.isArray(body?.urls) ? body.urls : []
    const urls = raw
      .map((u: unknown) => String(u || '').trim())
      .filter((u: string) => u.startsWith(SITE_URL))
      .slice(0, 10000)
    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'urls empty or outside SITE_URL' },
        { status: 400 }
      )
    }
    const result = await submitBatch(urls, key, keyLocation)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'indexnow failed' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const key = process.env.INDEXNOW_KEY
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'INDEXNOW_KEY not set' },
      { status: 500 }
    )
  }
  const url = req.nextUrl.searchParams.get('url') || ''
  if (!url.startsWith(SITE_URL)) {
    return NextResponse.json(
      { ok: false, error: 'url outside SITE_URL' },
      { status: 400 }
    )
  }
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION
  const result = await submitBatch([url], key, keyLocation)
  return NextResponse.json(result)
}
