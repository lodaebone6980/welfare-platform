'use client'
import { useState } from 'react'

const GEO_REGIONS = [
  '서울','경기','부산','인천','대구','대전',
  '광주','울산','세종','강원','충북','충남',
  '전북','전남','경북','경남','제주',
]

interface SeoPanelData {
  focusKeyword: string
  metaDesc:     string
  canonical:    string
  geoRegions:   string[]
  status:       'DRAFT' | 'REVIEW' | 'PUBLISHED'
  snsAutoShare: boolean
  fcmPush:      boolean
  requestIndex: boolean
}

interface Props {
  data:     SeoPanelData
  onChange: (data: SeoPanelData) => void
}

export function SeoPanel({ data, onChange }: Props) {
  const set = (key: keyof SeoPanelData, value: any) =>
    onChange({ ...data, [key]: value })

  const toggleRegion = (region: string) => {
    const next = data.geoRegions.includes(region)
      ? data.geoRegions.filter(r => r !== region)
      : [...data.geoRegions, region]
    set('geoRegions', next)
  }

  return (
    <div className="space-y-5">
      {/* SEO */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">포커스 키워드</label>
        <input
          value={data.focusKeyword}
          onChange={e => set('focusKeyword', e.target.value)}
          placeholder="에너지바우처 신청"
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg
            bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">메타 디스크립션</label>
        <textarea
          value={data.metaDesc}
          onChange={e => set('metaDesc', e.target.value)}
          placeholder="140자 이내로 페이지를 요약하세요"
          rows={2}
          maxLength={160}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg
            bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
        />
        <div className="text-right text-xs text-gray-400">{data.metaDesc.length}/160</div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Canonical URL</label>
        <input
          value={data.canonical}
          onChange={e => set('canonical', e.target.value)}
          placeholder="https://yourdomain.com/welfare/slug"
          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg
            bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
      </div>

      {/* GEO 타겟 */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">GEO 타겟 지역</label>
        <div className="flex flex-wrap gap-1.5">
          {GEO_REGIONS.map(region => (
            <button
              key={region}
              type="button"
              onClick={() => toggleRegion(region)}
              className={[
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                data.geoRegions.includes(region)
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300',
              ].join(' ')}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* 발행 설정 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">발행 상태</label>
        <select
          value={data.status}
          onChange={e => set('status', e.target.value)}
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="DRAFT">초안</option>
          <option value="REVIEW">검토 중</option>
          <option value="PUBLISHED">발행</option>
        </select>
      </div>

      <div className="space-y-3">
        {[
          { key: 'snsAutoShare', label: 'SNS 자동 공유' },
          { key: 'fcmPush',      label: 'FCM 푸시 발송' },
          { key: 'requestIndex', label: '구글 색인 요청 (IndexNow)' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">{label}</span>
            <div
              onClick={() => set(key as keyof SeoPanelData, !data[key as keyof SeoPanelData])}
              className={[
                'w-9 h-5 rounded-full transition-colors relative',
                data[key as keyof SeoPanelData] ? 'bg-blue-500' : 'bg-gray-200',
              ].join(' ')}
            >
              <div className={[
                'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm',
                data[key as keyof SeoPanelData] ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')} />
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
