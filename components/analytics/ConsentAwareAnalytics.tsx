'use client'

import { useEffect, useState } from 'react'
import Tracker from './Tracker'
import GA4 from './GA4'

const CONSENT_COOKIE = 'gm_consent_v1'

type ConsentState = 'unknown' | 'granted' | 'denied'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
}

export default function ConsentAwareAnalytics({
  gaId,
  internalTrackerEnabled,
}: {
  gaId?: string
  internalTrackerEnabled?: boolean
}) {
  const [consent, setConsent] = useState<ConsentState>('unknown')

  useEffect(() => {
    const saved = readCookie(CONSENT_COOKIE)
    if (saved === 'granted' || saved === 'denied') {
      setConsent(saved)
    }
  }, [])

  function decide(next: 'granted' | 'denied') {
    writeCookie(CONSENT_COOKIE, next, 365 * 24 * 60 * 60)
    setConsent(next)
    ;(window as any).gtag?.('consent', 'update', {
      analytics_storage: next === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    })

    if (next === 'denied') {
      deleteCookie('gm_sid')
      deleteCookie('gm_uid')
    }
  }

  if (consent === 'granted') {
    return (
      <>
        <Tracker enabled={internalTrackerEnabled} />
        {gaId ? <GA4 gaId={gaId} /> : null}
      </>
    )
  }

  if (consent === 'denied') return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-3 shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-3">
      <p className="text-xs leading-5 text-gray-600">
        방문 통계 개선을 위해 익명 분석 쿠키를 사용합니다. 거부하면 GA4와 내부 방문 기록을 보내지 않습니다.
      </p>
      <div className="mt-3 flex gap-2 sm:mt-0">
        <button
          type="button"
          onClick={() => decide('denied')}
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:flex-none"
        >
          거부
        </button>
        <button
          type="button"
          onClick={() => decide('granted')}
          className="flex-1 rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 sm:flex-none"
        >
          동의
        </button>
      </div>
    </div>
  )
}
