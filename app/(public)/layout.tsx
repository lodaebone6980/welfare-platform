import Script from 'next/script'
import { Suspense } from 'react'
import MobileHeader from '@/components/layout/MobileHeader'
import Footer from '@/components/common/Footer'
import BottomNav from '@/components/layout/BottomNav'
import ChannelTalk from '@/components/layout/ChannelTalk'
import ConsentAwareAnalytics from '@/components/analytics/ConsentAwareAnalytics'
import { ADSENSE_CLIENT, GA_ID, INTERNAL_TRACKER_ENABLED } from '@/lib/env'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <MobileHeader />
      <div className="max-w-3xl mx-auto">
        {children}
        <Footer />
      </div>
      <BottomNav />
      <ChannelTalk />
      <Suspense fallback={null}>
        <ConsentAwareAnalytics
          gaId={GA_ID}
          internalTrackerEnabled={INTERNAL_TRACKER_ENABLED}
        />
      </Suspense>
      {ADSENSE_CLIENT ? (
        <Script
          id="adsense-review-code"
          strategy="afterInteractive"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          crossOrigin="anonymous"
        />
      ) : null}
    </>
  )
}
