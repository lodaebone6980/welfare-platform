'use client'

/**
 * 자체 트래픽 수집 클라이언트.
 * - 페이지 전환 시 /api/track/pageview 로 비콘 전송
 * - 30분 롤링 sessionId · 1년 visitorId 쿠키 사용 (1st-party only, no cross-site)
 * - 어드민 경로(/dashboard, /content, /traffic, /api-status, /trending, /trending-news,
 *   /marketing, /popularity, /members, /settings, /search-trending, /admin, /access/admin)는 자동 스킵
 * - 광고 클릭 ID(gclid/fbclid/yclid/msclkid/ttclid/li_fat_id/n_media/kakaoad) 감지 →
 *   utm_source/utm_medium 미제공시 유료 광고 유입으로 자동 보강
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
  '/diagnostics',
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

/**
 * 광고 클릭 ID → 유료 유입 UTM 추정.
 * URL에 utm_source/utm_medium이 이미 있으면 그것을 우선하고,
 * 없는 경우에만 광고 클릭 ID로부터 source/medium을 합성한다.
 */
function inferPaidUtm(search: URLSearchParams | null): {
  source?: string
  medium?: string
  clickId?: string
  clickIdType?: string
} {
  if (!search) return {}
  const has = (k: string) => {
    const v = search.get(k)
    return v && v.length > 0 ? v : null
  }
  // Google Ads (검색/디스플레이/iOS/YouTube)
  const gclid = has('gclid') || has('gbraid') || has('wbraid')
  if (gclid) return { source: 'google', medium: 'cpc', clickId: gclid, clickIdType: 'gclid' }
  // Microsoft (Bing) Ads
  const msclkid = has('msclkid')
  if (msclkid) return { source: 'bing', medium: 'cpc', clickId: msclkid, clickIdType: 'msclkid' }
  // Yandex Direct
  const yclid = has('yclid')
  if (yclid) return { source: 'yandex', medium: 'cpc', clickId: yclid, clickIdType: 'yclid' }
  // Meta (Facebook/Instagram) Ads
  const fbclid = has('fbclid')
  if (fbclid) return { source: 'facebook', medium: 'paid_social', clickId: fbclid, clickIdType: 'fbclid' }
  // TikTok Ads
  const ttclid = has('ttclid')
  if (ttclid) return { source: 'tiktok', medium: 'paid_social', clickId: ttclid, clickIdType: 'ttclid' }
  // LinkedIn Ads
  const lfid = has('li_fat_id') || has('li_click_id')
  if (lfid) return { source: 'linkedin', medium: 'paid_social', clickId: lfid, clickIdType: 'li_fat_id' }
  // Naver 검색광고 (n_media/n_query/n_rank/n_campaign 등)
  const nMedia = has('n_media') || has('n_ad') || has('n_ad_group') || has('n_campaign')
  if (nMedia) return { source: 'naver', medium: 'cpc', clickId: nMedia, clickIdType: 'naver_ad' }
  // Kakao 모먼트
  const kakaoAd = has('kakaoad') || has('kakao_ad')
  if (kakaoAd) return { source: 'kakao', medium: 'paid_social', clickId: kakaoAd, clickIdType: 'kakao_ad' }
  return {}
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

    const paid = inferPaidUtm(search ?? null)

    const utm = {
      utm_source:   search?.get('utm_source')   || paid.source      || undefined,
      utm_medium:   search?.get('utm_medium')   || paid.medium      || undefined,
      utm_campaign: search?.get('utm_campaign') || undefined,
      utm_term:     search?.get('utm_term')     || undefined,
      utm_content:  search?.get('utm_content')  || paid.clickIdType || undefined,
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
      // 검증/디버그용 부가 필드 (서버에서 스키마에 없는 필드는 무시됨)
      adClickId: paid.clickId,
      adClickIdType: paid.clickIdType,
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
