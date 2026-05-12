'use client'

import type { AnchorHTMLAttributes, ReactNode } from 'react'

type EventName =
  | 'apply_click'
  | 'official_source_click'
  | 'share_click'
  | 'recommend_start'
  | 'login_start'

const CONSENT_COOKIE = 'gm_consent_v1'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : null
}

function currentUtm() {
  if (typeof window === 'undefined') return {}
  const search = new URLSearchParams(window.location.search)
  return {
    utm_source: search.get('utm_source') || undefined,
    utm_medium: search.get('utm_medium') || undefined,
    utm_campaign: search.get('utm_campaign') || undefined,
    utm_term: search.get('utm_term') || undefined,
    utm_content: search.get('utm_content') || undefined,
  }
}

function sendEvent(name: EventName, metadata?: Record<string, string | number | boolean | null>) {
  if (typeof window === 'undefined') return
  if (readCookie(CONSENT_COOKIE) !== 'granted') return

  const payload = {
    name,
    path: window.location.pathname,
    fullPath: window.location.pathname + window.location.search,
    title: document.title,
    referrer: document.referrer || undefined,
    utm: currentUtm(),
    sessionId: readCookie('gm_sid') || undefined,
    visitorId: readCookie('gm_uid') || undefined,
    metadata,
  }
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  let sent = false
  if ('sendBeacon' in navigator) {
    try { sent = navigator.sendBeacon('/api/track/event', blob) } catch {}
  }
  if (!sent) {
    fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }
}

export default function TrackedExternalLink({
  href,
  eventName,
  metadata,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  eventName: EventName
  metadata?: Record<string, string | number | boolean | null>
  children: ReactNode
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        sendEvent(eventName, { href, ...metadata })
        onClick?.(event)
      }}
      {...props}
    >
      {children}
    </a>
  )
}
