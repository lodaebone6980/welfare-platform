'use client'

/**
 * 자체 트래픽 수집 클라이언트.
 * - 페이지 전환 시 /api/track/pageview 로 비콘 전송
 * - 30분 롤링 sessionId · 1년 visitorId 쿠키 사용 (1st-party only, no cross-site)
 * - 어드민 경로(/dashboard, /content, /traffic, /api-status, /trending, /trending-news,
 *   /marketing, /popularity, /members, /settings, /search-trending, /admin, /access/admin)는 자동 스킵
 * - 환경변수 NEXT_PUBLIC_INTERNAL_TRACKER=0 이면 비활성
 */

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

const SESSION_COOKIE = 'gm_sid'
const VISITOR_COOKIE = 'gm_uid'
const SESSION_MIN = 30
const ADMIN_PREFIXES = [
  '/dashboard',
  '/content',
  '/traffic',
  '/api-status',
  '/trending',
  '/trending-news',
  '/marketing',
  '/popularity',
  '/members',
  '/settings',
  '/search-trending',
  '/admin',
  '/access/admin',
]

function isAdminPath(p: string): boolean {
  return ADMIN_PREFIXES.some(x => p === x || p.startsWith(x + '/'))
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    name + '=' + encodeURIComponent(value) +
    '; Max-Age=' + maxAgeSec +
    '; Path=/; SameSite=Lax' + secure
}

function genId(): string {
  // crypto.randomUUID는 모든 모던 브라우저에서 지원
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID()
  }
  // fallback
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function ensureSessionId(): string {
  const existing = readCookie(SESSION_COOKIE)
  if (existing) {
    writeCookie(SESSION_COOKIE, existing, SESSION_MIN * 60) // refresh
    return existing
  }
  const id = genId()
  writeCookie(SESSION_COOKIE, id, SESSION_MIN * 60)
  return id
}

function ensureVisitorId(): string {
  const existing = readCookie(VISITOR_COOKIE)
  if (existing) return existing
  const id = genId()
  writeCookie(VISITOR_COOKIE, id, 365 * 24 * 60 * 60)
  return id
}

interface TrackerProps {
  enabled?: boolean
}

export default function Tracker({ enabled = true }: TrackerProps) {
  const pathname = usePathname()
  const search = useSearchParams()
  const lastSent = useRef<string>('')

  useEffect(() => {
    if (!enabled) return
    if (!pathname) return
    if (isAdminPath(pathname)) return

    const fullPath = pathname + (search?.toString() ? '?' + search.toString() : '')
    if (fullPath === lastSent.current) return
    lastSent.current = fullPath

    const utm = {
      utm_source:   search?.get('utm_source')   || undefined,
      utm_medium:   search?.get('utm_medium')   || undefined,
      utm_campaign: search?.get('utm_campaign') || undefined,
      utm_term:     search?.get('utm_term')     || undefined,
      utm_content:  search?.get('utm_content')  || undefined,
    }
    const srcParam = search?.get('src') || undefined

    const payload = {
      path: pathname,
      fullPath,
      title: typeof document !== 'undefined' ? document.title : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      utm,
      srcParam,
      sessionId: ensureSessionId(),
      visitorId: ensureVisitorId(),
    }

    const url = '/api/track/pageview'
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })

    let sent = false
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try { sent = (navigator as any).sendBeacon(url, blob) } catch {}
    }
    if (!sent) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }
  }, [enabled, pathname, search])

  return null
}
