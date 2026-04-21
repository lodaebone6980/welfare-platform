'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Policy {
  id: number
  slug: string
  title: string
  excerpt: string | null
  category: { id: number; name: string; slug: string } | null
  geoRegion: string | null
  applyUrl: string | null
  viewCount: number
  publishedAt: string | null
}

const CATEGORY_TABS = [
  { label: '전체',   value: 'ALL' },
  { label: '지원금', value: '지원금' },
  { label: '보조금', value: '보조금' },
  { label: '바우처', value: '바우처' },
  { label: '환급금', value: '환급금' },
  { label: '대출',   value: '대출' },
]

const CATEGORY_COLORS: Record<string, string> = {
  '지원금': 'bg-blue-100 text-blue-700',
  '보조금': 'bg-green-100 text-green-700',
  '바우처': 'bg-purple-100 text-purple-700',
  '환급금': 'bg-amber-100 text-amber-700',
  '대출':   'bg-red-100 text-red-700',
}

export function PolicyFeed({ policies }: { policies: Policy[] }) {
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = policies.filter(p => {
    if (activeTab !== 'ALL' && p.category?.name !== activeTab) return false
    if (search && !p.title.includes(search) && !p.excerpt?.includes(search)) return false
    return true
  })

  return (
    <>
      {/* 검색바 */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <svg className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="지원금 검색 (예: 청년 월세, 출산 지원금)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 ml-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm rounded-full whitespace-nowrap transition-colors border ${
              activeTab === tab.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.value !== 'ALL' && (
              <span className="ml-1 text-xs opacity-60">
                {policies.filter(p => p.category?.name === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 결과 개수 */}
      <div className="text-xs text-gray-400 mb-4">
        {search ? `"${search}" 검색 결과 ` : ''}{filtered.length}건
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {search ? `"${search}" 검색 결과가 없습니다` : '해당 카테고리에 정책이 없습니다'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(policy => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      )}
    </>
  )
}

function PolicyCard({ policy }: { policy: Policy }) {
  const catColor = CATEGORY_COLORS[policy.category?.name ?? ''] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
      {/* 상단: 카테고리 + 지역 */}
      <div className="flex items-center gap-2 mb-3">
        {policy.category && (
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${catColor}`}>
            {policy.category.name}
          </span>
        )}
        {policy.geoRegion && (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500">
            {policy.geoRegion}
          </span>
        )}
      </div>

      {/* 정책명 */}
      <Link href={`/welfare/${policy.slug}`} className="block mb-2">
        <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
          {policy.title}
        </h3>
      </Link>

      {/* 요약 */}
      {policy.excerpt && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
          {policy.excerpt}
        </p>
      )}

      {/* 하단: 조회수 + 신청 버튼 */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <span className="text-[11px] text-gray-400">
          조회 {policy.viewCount.toLocaleString()}
        </span>
        {policy.applyUrl ? (
          <a
            href={policy.applyUrl}
            rel="nofollow"
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            신청하기
          </a>
        ) : (
          <Link
            href={`/welfare/${policy.slug}`}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            자세히 보기
          </Link>
        )}
      </div>
    </div>
  )
}
