'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Status = 'ALL' | 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

const STATUS_OPTIONS: { value: Status; label: string; color: string }[] = [
  { value: 'ALL',       label: '전체',    color: 'bg-gray-100 text-gray-600' },
  { value: 'DRAFT',     label: '초안',    color: 'bg-yellow-100 text-yellow-700' },
  { value: 'REVIEW',    label: '검토중',  color: 'bg-blue-100 text-blue-700' },
  { value: 'PUBLISHED', label: '발행됨',  color: 'bg-green-100 text-green-700' },
  { value: 'ARCHIVED',  label: '보관',    color: 'bg-gray-100 text-gray-500' },
]

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     'bg-yellow-100 text-yellow-700',
  REVIEW:    'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED:  'bg-gray-200 text-gray-500',
}

export default function PolicyListPage() {
  const [policies,  setPolicies]  = useState<any[]>([])
  const [total,     setTotal]     = useState(0)
  const [status,    setStatus]    = useState<Status>('ALL')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(0)
  const [loading,   setLoading]   = useState(true)
  const PAGE_SIZE = 20

  const fetchPolicies = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)
    params.set('take', String(PAGE_SIZE))
    params.set('skip', String(page * PAGE_SIZE))

    try {
      const res = await fetch(`/api/policies?${params}`)
      const data = await res.json()
      setPolicies(data.policies ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setPolicies([])
      setTotal(0)
    }
    setLoading(false)
  }, [status, search, page])

  useEffect(() => { fetchPolicies() }, [fetchPolicies])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-medium text-gray-800">정책 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">총 {total}건</p>
        </div>
        <Link
          href="/content/policy/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          새 정책
        </Link>
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* 상태 필터 */}
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

        {/* 검색 */}
        <div className="flex-1 sm:max-w-xs">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <svg className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="제목, 키워드 검색..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(0) }} className="text-gray-400 hover:text-gray-600 ml-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : policies.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-sm text-gray-400 mb-2">
            {search ? `"${search}" 검색 결과가 없습니다` : '등록된 정책이 없습니다'}
          </div>
          <Link href="/content/policy/new" className="text-xs text-blue-500 hover:underline">
            첫 정책 만들기
          </Link>
        </div>
      ) : (
        <>
          {/* 데스크탑 테이블 */}
          <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-gray-400 font-normal">제목</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">��태</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">카테고리</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">지역</th>
                  <th className="text-right px-3 py-2.5 text-gray-400 font-normal">조회</th>
                  <th className="text-right px-3 py-2.5 text-gray-400 font-normal">FAQ</th>
                  <th className="text-left px-3 py-2.5 text-gray-400 font-normal">날짜</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/content/policy/${p.id}`} className="text-gray-800 hover:text-blue-600 font-medium max-w-[280px] truncate block">
                        {p.title}
                      </Link>
                      {p.focusKeyword && (
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{p.focusKeyword}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[p.status]}`}>
                        {STATUS_OPTIONS.find(o => o.value === p.status)?.label ?? p.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{p.category?.name ?? '-'}</td>
                    <td className="px-3 py-3 text-gray-500">{p.geoRegion ?? '-'}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{p.viewCount?.toLocaleString() ?? 0}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{p._count?.faqs ?? 0}</td>
                    <td className="px-3 py-3 text-gray-400">
                      {new Date(p.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {policies.map((p: any) => (
              <Link
                key={p.id}
                href={`/content/policy/${p.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{p.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${STATUS_BADGE[p.status]}`}>
                    {STATUS_OPTIONS.find(o => o.value === p.status)?.label ?? p.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  {p.category && <span>{p.category.name}</span>}
                  {p.geoRegion && <span>{p.geoRegion}</span>}
                  <span>조회 {p.viewCount?.toLocaleString() ?? 0}</span>
                  <span>{new Date(p.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 페이지네이션 */}
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
