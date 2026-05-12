'use client'

import { useEffect, useState } from 'react'

type Format = 'checklist' | 'qa' | 'story' | 'number' | 'compilation' | 'cardnews'
type Tab = 'published' | 'pending' | 'create'

const FORMATS: Format[] = ['checklist', 'qa', 'story', 'number', 'compilation', 'cardnews']

const FORMAT_COLORS: Record<Format, string> = {
  checklist: 'bg-green-100 text-green-700',
  qa: 'bg-blue-100 text-blue-700',
  story: 'bg-amber-100 text-amber-700',
  number: 'bg-red-100 text-red-700',
  compilation: 'bg-purple-100 text-purple-700',
  cardnews: 'bg-pink-100 text-pink-700',
}

export default function ThreadsPage() {
  const [tab, setTab] = useState<Tab>('published')
  const [posts, setPosts] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [selPolicy, setSelPolicy] = useState('')
  const [selFormat, setSelFormat] = useState<Format>('checklist')
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [stats, setStats] = useState({ pending: 0, total: 0, today: 0 })
  const [notice, setNotice] = useState<string | null>(null)

  async function loadPosts() {
    const res = await fetch('/api/admin/threads/posts')
    const d = await res.json()
    if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
    setPosts(d.posts ?? [])
    setStats({ pending: d.pending ?? 0, total: d.total ?? 0, today: d.today ?? 0 })
    setConfigured(Boolean(d.configured))
  }

  useEffect(() => {
    loadPosts().catch(() => {})
    fetch('/api/admin/policies?status=PUBLISHED&take=50')
      .then(r => r.json())
      .then(d => setPolicies(d.policies ?? []))
      .catch(() => {})
  }, [])

  async function generate() {
    if (!selPolicy) return setNotice('정책을 선택해 주세요.')
    setGenerating(true)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/threads/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId: Number(selPolicy), format: selFormat }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
      setGenerated(d.content ?? '')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  async function publish() {
    if (!generated || !selPolicy) return
    setPublishing(true)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/threads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: Number(selPolicy),
          format: selFormat,
          content: generated,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`)
      setGenerated('')
      setNotice(d.configured ? 'Threads에 발행했습니다.' : 'Threads 환경변수가 없어 draft로 저장했습니다.')
      setTab('published')
      await loadPosts()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '발행에 실패했습니다.')
    } finally {
      setPublishing(false)
    }
  }

  const pendingPosts = posts.filter(p => p.status === 'draft')
  const visiblePosts = tab === 'pending' ? pendingPosts : posts

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium text-gray-800">Threads 관리</h1>
          <p className="text-xs text-gray-500 mt-1">
            {configured ? 'Threads 자동 발행이 활성화되어 있습니다.' : 'Threads API 환경변수 미설정: 발행 요청은 draft 저장으로 처리됩니다.'}
          </p>
        </div>
        <span className={`hidden sm:flex items-center gap-1.5 text-xs ${configured ? 'text-green-600' : 'text-amber-600'}`}>
          <span className={`w-2 h-2 rounded-full inline-block ${configured ? 'bg-green-500' : 'bg-amber-500'}`} />
          {configured ? 'connected' : 'draft only'}
        </span>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
        {[
          { label: '대기중', value: stats.pending, color: 'text-blue-600' },
          { label: '총 발행', value: stats.total, color: 'text-gray-700' },
          { label: '오늘 발행', value: stats.today, color: 'text-gray-700' },
          { label: '일일 여유', value: Math.max(0, 5 - stats.today), color: 'text-red-500' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-lg p-3">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{c.label}</div>
            <div className={`text-xl sm:text-2xl font-medium ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {(['published', 'pending', 'create'] as Tab[]).map(t => (
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
            {{ published: `게시물 ${posts.length}`, pending: `대기 ${stats.pending}`, create: '생성' }[t]}
          </button>
        ))}
      </div>

      {tab !== 'create' && (
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['정책', '콘텐츠', '포맷', '상태', '발행일', '링크'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-gray-400">표시할 게시물이 없습니다.</td>
                </tr>
              ) : visiblePosts.map((p: any) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-gray-600 max-w-40 truncate">{p.policy?.title ?? '-'}</td>
                  <td className="px-3 py-2.5 text-gray-500 max-w-80 truncate">{p.content}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${FORMAT_COLORS[p.format as Format] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.format}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{p.status}</td>
                  <td className="px-3 py-2.5 text-gray-400">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.threadsId ? (
                      <a href={`https://www.threads.net/t/${p.threadsId}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">보기</a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'create' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">정책 선택</label>
              <select
                value={selPolicy}
                onChange={e => setSelPolicy(e.target.value)}
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
              >
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
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelFormat(f)}
                    className={`px-2.5 py-1.5 text-xs rounded-full border transition-colors ${
                      selFormat === f ? FORMAT_COLORS[f] + ' border-transparent' : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={generating || !selPolicy}
            className="w-full sm:w-auto px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? 'AI 생성 중...' : 'AI 자동 생성'}
          </button>

          {generated && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">미리보기 / 수정</span>
                <span className="text-xs text-gray-400">{generated.length} / 500</span>
              </div>
              <textarea
                value={generated}
                onChange={e => setGenerated(e.target.value)}
                maxLength={500}
                rows={8}
                className="w-full text-sm border-0 resize-none focus:outline-none text-gray-700 leading-relaxed"
              />
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setGenerated('')}
                  className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="flex-1 sm:flex-none px-5 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {publishing ? '저장/발행 중...' : configured ? 'Threads 발행' : 'Draft 저장'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
