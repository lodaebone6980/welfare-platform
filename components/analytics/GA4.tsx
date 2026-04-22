'use client'

/**
 * GA4 부트스트랩. NEXT_PUBLIC_GA_ID 가 비어있으면 렌더하지 않는다.
 * Consent Mode v2 기본값: analytics_storage='granted', ad_storage='denied'
 * (추후 CMP 도입 시 updateConsent() 로 변경)
 */

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function GA4({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (!gaId) return
    if (typeof window === 'undefined') return
    const url = pathname + (search?.toString() ? '?' + search.toString() : '')
    ;(window as any).gtag?.('event', 'page_view', {
      page_path: url,
      page_location: location.href,
      page_title: document.title,
    })
  }, [gaId, pathname, search])

  if (!gaId) return null

  return (
    <>
      <Script
        id="ga4-src"
        strategy="afterInteractive"
        src={'https://www.googletagmanager.com/gtag/js?id=' + gaId}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'granted',
          });
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
