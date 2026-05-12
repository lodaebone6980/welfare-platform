'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type Status = 'ALL' | 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'ALL', label: '전체', color: 'bg-gray-100 text-gray-600' },
  { value: 'DRAFT', label: '초안', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'REVIEW', label: '검토중', color: 'bg-blue-100 text-blue-700' },
  { value: 'PUBLISHED', label: '발행됨', color: 'bg-green-100 text-green-700' },
  { value: 'ARCHIVED', label: '보관', color: 'bg-gray-100 text-gray-500' },
]

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  REVIEW: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-200 text-gray-500',
}

function campaignMonth() {
  return new Date().toISOString().slice(0, 7).replace('-', '')
}

function snsUrl(policy: any, source: 'threads' | 'instagram') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.govmate.co.kr'
  const slug = policy.slug || `policy-${policy.id}`
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: 'social',
    utm_campaign: `policy_card_${campaignMonth()}`,
    utm_content: source === 'threads' ? `${slug}-card` : `post-${slug}`,
  })
  return `${origin}/welfare/${encodeURIComponent(slug)}?${params.toString()}`
}

export default function PolicyListClient({
  initialPolicies,
  initialTotal,
}: {
  initialPolicies: any[]
  initialTotal: number
}) {
  const [policies, setPolicies] = useState<any[]>(initialPolicies)
  const [total, setTotal] = useState(initialTotal)
  const [status, setStatus] = useState<Status>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isInitial, setIsInitial] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const PAGE_SIZE = 20

  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(page * PAGE_SIZE))

    try {
      const res = await fetch(`/api/admin/policies?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setPolicies(data.policies ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setPolicies([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [status, search, page])

  useEffect(() => {
    if (isInitial) {
      setIsInitial(false)
      return
    }
    fetchPolicies()
  }, [fetchPolicies, isInitial])

  async function copyLink(policy: any, source: 'threads' | 'instagram') {
    const url = snsUrl(policy, source)
    await navigator.clipboard.writeText(url)
    setCopied(`${policy.id}-${source}`)
    window.setTimeout(() => setCopied(null), 1200)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-medium text-gray-800">정책 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">총 {total.toLocaleString()}건</p>
        </div>
        <Link
          href="/content/policy/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새 정책
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(0) }}
              className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors border ${
                status === opt.value
                  ? opt.color + ' border-transparent font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex-1 sm:max-w-xs">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <input
              type="text"
              placeholder="제목, 키워드 검색"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(0) }} className="text-gray-400 hover:text-gray-600 ml-1">
                지우기
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : policies.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-sm text-gray-400 mb-2">
            {search ? `"${search}" 검색 결과가 없습니다.` : '등록된 정책이 없습니다.'}
          </div>
          <Link href="/content/policy/new" className="text-xs text-blue-500 hover:underline">
            첫 정책 만들기
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden sm:block bg-white border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-gray-400 font-normal">제목</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">상태</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">카테고리</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">지역</th>
                  <th className="text-right px-3 py-2.5 text-gray-400 font-normal">조회</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">SNS</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">날짜</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/content/policy/${p.id}`} className="text-gray-800 hover:text-blue-600 font-medium max-w-[320px] truncate block">
                        {p.title}
                      </Link>
                      <Link href={`/content/policy/${p.id}/edit`} className="text-[10px] text-gray-400 hover:text-blue-500">
                        수정
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_OPTIONS.find(o => o.value === p.status)?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{p.category?.name ?? '-'}</td>
                    <td className="px-3 py-3 text-gray-500">{p.geoRegion ?? '-'}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{p.viewCount?.toLocaleString() ?? 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        {(['threads', 'instagram'] as const).map(source => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => copyLink(p, source)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50"
                          >
                            {copied === `${p.id}-${source}` ? '복사됨' : source === 'threads' ? 'Threads' : 'Instagram'}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden space-y-2">
            {policies.map((p: any) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <Link href={`/content/policy/${p.id}`} className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">
                    {p.title}
                  </Link>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_OPTIONS.find(o => o.value === p.status)?.label ?? p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  {p.category && <span>{p.category.name}</span>}
                  {p.geoRegion && <span>{p.geoRegion}</span>}
                  <span>조회 {p.viewCount?.toLocaleString() ?? 0}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/content/policy/${p.id}/edit`} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">
                    수정
                  </Link>
                  <button type="button" onClick={() => copyLink(p, 'threads')} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">
                    Threads
                  </button>
                  <button type="button" onClick={() => copyLink(p, 'instagram')} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-gray-500">
                    Instagram
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                이전
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-30 hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
