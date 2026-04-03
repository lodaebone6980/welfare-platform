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
    })
    fetch('/api/policies?status=PUBLISHED&take=50').then(r => r.json()).then(d => {
      setPolicies(d.policies ?? [])
    })
  }, [])

  const generate = async () => {
    if (!selPolicy) return alert('정책을 선택하세요')
    setGenerating(true)
    const res = await fetch('/api/threads/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: Number(selPolicy), format: selFormat }),
    })
    const d = await res.json()
    setGenerated(d.content ?? '')
    setGenerating(false)
  }

  const publish = async () => {
    if (!generated) return
    setPublishing(true)
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
    setPublishing(false)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium text-gray-800">Threads 관리</h1>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          @govhelp.co.kr 연결됨
        </span>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: '대기중',      value: stats.pending, color: 'text-blue-600' },
          { label: '총 발행',     value: stats.total,   color: 'text-gray-700' },
          { label: '오늘 발행',   value: stats.today,   color: 'text-gray-700' },
          { label: '잔여 (일 5건)', value: Math.max(0, 5 - stats.today), color: 'text-red-500' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-1">{c.label}</div>
            <div className={`text-2xl font-medium ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {(['published','pending','create'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-xs border-b-2 transition-colors',
              tab === t
                ? 'border-gray-800 text-gray-800 font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            {{ published: `발행됨 ${stats.total}`, pending: `대기중 ${stats.pending}`, create: '생성하기' }[t]}
          </button>
        ))}
      </div>

      {/* 발행됨 탭 */}
      {tab === 'published' && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['정책','콘텐츠','포맷','판정','발행일',''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p: any) => (
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
                        className="text-blue-500 hover:underline">보기 ↗</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 생성하기 탭 */}
      {tab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">정책 선택</label>
              <select value={selPolicy} onChange={e => setSelPolicy(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <option value="">정책을 선택하세요</option>
                {policies.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">포맷 선택</label>
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map(f => (
                  <button key={f} onClick={() => setSelFormat(f)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors
                      ${selFormat === f ? FORMAT_COLORS[f] + ' border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={generating || !selPolicy}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                  취소
                </button>
                <button onClick={publish} disabled={publishing}
                  className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {publishing ? '발행 중...' : '저장 & 발행'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
