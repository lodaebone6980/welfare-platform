'use client'

import { useEffect, useState } from 'react'
import type { TrafficSource } from '@/lib/tracking'

type SourceDetail = {
  source: TrafficSource
  total: number
  paid: number
  organic: number
  topCampaigns: { campaign: string; count: number }[]
  topLandingPages: { path: string; count: number }[]
}

const SOURCE_LABEL: Record<string, string> = {
  direct: '직접 방문',
  google: '구글',
  naver: '네이버',
  bing: '빙',
  daum: '다음',
  yahoo: '야후',
  yandex: '얀덱스',
  facebook: '페이스북',
  threads: 'Threads',
  x: 'X(트위터)',
  instagram: '인스타그램',
  kakao: '카카오',
  youtube: '유튜브',
  tiktok: '틱톡',
  linkedin: '링크드인',
  reddit: '레딧',
  other: '기타',
}

export default function SourceDetailsGrid({ range }: { range: string }) {
  const [data, setData] = useState<SourceDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setData(null)
    setError(null)
    const controller = new AbortController()

    fetch(`/api/admin/traffic/source-detail?range=${encodeURIComponent(range)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: { data: SourceDetail[] }) => {
        if (active) setData(json.data ?? [])
      })
      .catch(err => {
        if (active && err.name !== 'AbortError') {
          setError(err.message ?? 'Unknown error')
          setData([])
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [range])

  if (error) {
    return (
      <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-4 text-xs text-red-700">
        소스별 상세 로딩 실패: {error}
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="mt-5 rounded-lg border border-gray-100 bg-white p-6 text-center text-xs text-gray-400">
        소스별 상세 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {data.map(d => (
        <SourceDetailCard key={d.source} detail={d} />
      ))}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-20 bg-gray-100 rounded" />
        <div className="h-3 w-12 bg-gray-100 rounded" />
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

function SourceDetailCard({ detail }: { detail: SourceDetail }) {
  const paidPct = detail.total > 0 ? Math.round((detail.paid / detail.total) * 100) : 0
  const organicPct = detail.total > 0 ? 100 - paidPct : 0
  const label = SOURCE_LABEL[detail.source] ?? detail.source

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-[10px] text-gray-400">{detail.total.toLocaleString()} PV</div>
      </div>
      {detail.total === 0 ? (
        <div className="py-4 text-center text-[11px] text-gray-400">데이터 없음</div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-1">
            <span>유료 {detail.paid.toLocaleString()} ({paidPct}%)</span>
            <span>·</span>
            <span>자연 {detail.organic.toLocaleString()} ({organicPct}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex mb-3">
            {paidPct > 0 && <div className="h-full bg-red-400" style={{ width: `${paidPct}%` }} />}
            {organicPct > 0 && <div className="h-full bg-amber-300" style={{ width: `${organicPct}%` }} />}
          </div>

          {detail.topCampaigns.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-400 mb-1">상위 캠페인</div>
              <ul className="space-y-0.5">
                {detail.topCampaigns.slice(0, 3).map((c, i) => (
                  <li key={`${c.campaign}-${i}`} className="flex justify-between text-[11px]">
                    <span className="text-gray-600 truncate max-w-[70%]">{c.campaign}</span>
                    <span className="text-gray-400">{c.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail.topLandingPages.length > 0 && (
            <div>
              <div className="text-[10px] text-gray-400 mb-1">상위 랜딩 페이지</div>
              <ul className="space-y-0.5">
                {detail.topLandingPages.slice(0, 3).map((p, i) => (
                  <li key={`${p.path}-${i}`} className="flex justify-between text-[11px]">
                    <span className="text-gray-600 truncate max-w-[70%]">{p.path}</span>
                    <span className="text-gray-400">{p.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
