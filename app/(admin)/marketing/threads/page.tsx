'use client'
import { useState, useEffect } from 'react'

type Format  = 'checklist' | 'qa' | 'story' | 'number' | 'compilation' | 'cardnews'
type Verdict = 'REWARD' | 'PUNISHMENT' | 'NEUTRAL'
type Tab     = 'published' | 'pending' | 'create'

const FORMAT_COLORS: Record<Format, string> = {
  checklist:   'bg-green-100 text-green-700',
  qa:          'bg-blue-100 text-blue-700',
  story:       'bg-amber-100 text-amber-700',
  number:      'bg-red-100 text-red-700',
  compilation: 'bg-purple-100 text-purple-700',
  cardnews:    'bg-pink-100 text-pink-700',
}

const VERDICT_COLORS: Record<Verdict, string> = {
  REWARD:      'bg-green-500 text-white',
  PUNISHMENT:  'bg-red-500 text-white',
  NEUTRAL:     'bg-gray-400 text-white',
}

const FORMATS: Format[] = ['checklist','qa','story','number','compilation','cardnews']

export default function ThreadsPage() {
  const [tab,        setTab]        = useState<Tab>('published')
  const [posts,      setPosts]      = useState<any[]>([])
  const [policies,   setPolicies]   = useState<any[]>([])
  const [selPolicy,  setSelPolicy]  = useState('')
  const [selFormat,  setSelFormat]  = useState<Format>('checklist')
  const [generated,  setGenerated]  = useState('')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [stats,      setStats]      = useState({ pending: 0, total: 0, today: 0 })

  useEffect(() => {
    fetch('/api/threads/posts').then(r => r.json()).then(d => {
      setPosts(d.posts ?? [])
      setStats({ pending: d.pending ?? 0, total: d.total ?? 0, today: d.today ?? 0 })
    }).catch(() => {})
    fetch('/api/policies?status=PUBLISHED&take=50').then(r => r.json()).then(d => {
      setPolicies(d.policies ?? [])
    }).catch(() => {})
  }, [])

  const generate = async () => {
    if (!selPolicy) return alert('정책을 선택하세요')
    setGenerating(true)
    try {
      const res = await fetch('/api/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: Number(selPolicy), format: selFormat }),
      })
      const d = await res.json()
      setGenerated(d.content ?? '')
    } catch {
      alert('생성 실패')
    }
    setGenerating(false)
  }

  const publish = async () => {
    if (!generated) return
    setPublishing(true)
    try {
      const res = await fetch('/api/threads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: Number(selPolicy),
          format:   selFormat,
          content:  generated,
        }),
      })
      if (res.ok) {
        alert('발행 완료!')
        setGenerated('')
        setTab('published')
      }
    } catch {
      alert('발행 실패')
    }
    setPublishing(false)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-gray-800">Threads 관리</h1>
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          연결됨
        </span>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        {[
          { label: '대기중',      value: stats.pending, color: 'text-blue-600' },
          { label: '총 발행',     value: stats.total,   color: 'text-gray-700' },
          { label: '오늘 발행',   value: stats.today,   color: 'text-gray-700' },
          { label: '잔여 (일 5건)', value: Math.max(0, 5 - stats.today), color: 'text-red-500' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-3">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{c.label}</div>
            <div className={`text-xl sm:text-2xl font-medium ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {(['published','pending','create'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-3 sm:px-4 py-2 text-xs border-b-2 transition-colors whitespace-nowrap',
              tab === t
                ? 'border-gray-800 text-gray-800 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            {{ published: `발행됨 ${stats.total}`, pending: `대기 ${stats.pending}`, create: '생성하기' }[t]}
          </button>
        ))}
      </div>

      {/* 발행됨 탭 */}
      {tab === 'published' && (
        <>
          {/* 데스크탑 테이블 */}
          <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['정책','콘텐츠','포맷','판정','발행일',''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-gray-400">발행된 포스트가 없습니다</td>
                  </tr>
                ) : posts.map((p: any) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-600 max-w-24 truncate">{p.policy?.title ?? '-'}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-48 truncate">{p.content}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${FORMAT_COLORS[p.format as Format]}`}>
                        {p.format}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.verdict && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${VERDICT_COLORS[p.verdict as Verdict]}`}>
                          {p.verdict}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.threadsId && (
                        <a href={`https://www.threads.net/t/${p.threadsId}`} target="_blank" rel="noopener"
                          className="text-blue-500 hover:underline">보기</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="sm:hidden space-y-2">
            {posts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">발행된 포스트��� 없습니다</div>
            ) : posts.map((p: any) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${FORMAT_COLORS[p.format as Format]}`}>
                    {p.format}
                  </span>
                  {p.verdict && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${VERDICT_COLORS[p.verdict as Verdict]}`}>
                      {p.verdict}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-600 line-clamp-2">{p.content}</div>
                <div className="text-[10px] text-gray-400 mt-1">{p.policy?.title ?? ''}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 대기중 탭 */}
      {tab === 'pending' && (
        <div className="py-12 text-center text-xs text-gray-400">
          대기중인 포스트가 없습니다
        </div>
      )}

      {/* 생성하기 탭 */}
      {tab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">정책 선택</label>
              <select value={selPolicy} onChange={e => setSelPolicy(e.target.value)}
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-white">
                <option value="">정책을 선택하세요</option>
                {policies.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">포맷 선택</label>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map(f => (
                  <button key={f} onClick={() => setSelFormat(f)}
                    className={`px-2.5 py-1.5 text-xs rounded-full border transition-colors
                      ${selFormat === f ? FORMAT_COLORS[f] + ' border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={generating || !selPolicy}
            className="w-full sm:w-auto px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {generating ? 'AI 생성 중...' : 'AI 자동 생성'}
          </button>

          {generated && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">미리보기 / 수정</span>
                <span className="text-xs text-gray-400">{generated.length} / 500자</span>
              </div>
              <textarea
                value={generated}
                onChange={e => setGenerated(e.target.value)}
                maxLength={500}
                rows={8}
                className="w-full text-sm border-0 resize-none focus:outline-none text-gray-700 leading-relaxed"
              />
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => setGenerated('')}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                  취소
                </button>
                <button onClick={publish} disabled={publishing}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {publishing ? '발행 중...' : '저장 & Threads 발행'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
