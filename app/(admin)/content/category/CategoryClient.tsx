'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: number
  name: string
  slug: string
  icon: string | null
  displayOrder: number
  policyCount: number
}

export default function CategoryClient({ initial }: { initial: Category[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Category[]>(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '', displayOrder: '' })

  async function refresh() {
    startTransition(() => router.refresh())
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      icon: form.icon.trim() || null,
      displayOrder: form.displayOrder === '' ? 0 : Number(form.displayOrder),
    }
    if (!payload.name) {
      setError('이름을 입력해주세요')
      return
    }
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) {
      setError(j.error || '생성 실패')
      return
    }
    setItems(prev => [...prev, { ...j.item, policyCount: 0 }])
    setForm({ name: '', slug: '', icon: '', displayOrder: '' })
    refresh()
  }

  async function handleUpdate(id: number, patch: Partial<Category>) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) {
      alert(j.error || '수정 실패')
      return
    }
    setItems(prev => prev.map(c => (c.id === id ? { ...c, ...j.item } : c)))
    refresh()
  }

  async function handleDelete(id: number) {
    if (!confirm('이 카테고리를 삭제할까요? 연결된 정책이 있으면 삭제되지 않습니다.')) return
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.ok) {
      alert(j.error || '삭제 실패')
      return
    }
    setItems(prev => prev.filter(c => c.id !== id))
    refresh()
  }

  return (
    <div className="space-y-5">
      {/* 생성 폼 */}
      <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-xs font-medium text-gray-600 mb-3">새 카테고리 추가</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <input
            className="border border-gray-200 rounded-md px-2 py-1.5 text-xs"
            placeholder="이름 (예: 주거)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border border-gray-200 rounded-md px-2 py-1.5 text-xs"
            placeholder="슬러그 (예: housing)"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="border border-gray-200 rounded-md px-2 py-1.5 text-xs"
            placeholder="아이콘 (이모지/키워드)"
            value={form.icon}
            onChange={e => setForm({ ...form, icon: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-200 rounded-md px-2 py-1.5 text-xs"
            placeholder="정렬 순서"
            value={form.displayOrder}
            onChange={e => setForm({ ...form, displayOrder: e.target.value })}
          />
        </div>
        {error && <div className="text-xs text-red-500 mb-2">{error}</div>}
        <button
          type="submit"
          disabled={pending}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs px-3 py-1.5 rounded-md"
        >
          추가
        </button>
      </form>

      {/* 목록 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="text-xs font-medium text-gray-600 mb-3">카테고리 목록 ({items.length})</div>
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">아직 등록된 카테고리가 없습니다</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 font-normal w-12">순서</th>
                  <th className="text-left py-1.5 font-normal">이름</th>
                  <th className="text-left py-1.5 font-normal">슬러그</th>
                  <th className="text-left py-1.5 font-normal">아이콘</th>
                  <th className="text-right py-1.5 font-normal">연결 정책</th>
                  <th className="text-right py-1.5 font-normal">작업</th>
                </tr>
              </thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5">
                      <input
                        type="number"
                        className="w-14 border border-gray-200 rounded-md px-1.5 py-1 text-xs"
                        defaultValue={c.displayOrder}
                        onBlur={e => {
                          const v = Number(e.target.value)
                          if (Number.isFinite(v) && v !== c.displayOrder) handleUpdate(c.id, { displayOrder: v })
                        }}
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        className="border border-gray-200 rounded-md px-1.5 py-1 text-xs min-w-[120px]"
                        defaultValue={c.name}
                        onBlur={e => {
                          const v = e.target.value.trim()
                          if (v && v !== c.name) handleUpdate(c.id, { name: v })
                        }}
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        className="border border-gray-200 rounded-md px-1.5 py-1 text-xs min-w-[120px]"
                        defaultValue={c.slug}
                        onBlur={e => {
                          const v = e.target.value.trim()
                          if (v && v !== c.slug) handleUpdate(c.id, { slug: v })
                        }}
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        className="border border-gray-200 rounded-md px-1.5 py-1 text-xs w-20"
                        defaultValue={c.icon ?? ''}
                        onBlur={e => {
                          const v = e.target.value.trim()
                          if ((v || null) !== c.icon) handleUpdate(c.id, { icon: v || null })
                        }}
                      />
                    </td>
                    <td className="py-1.5 text-right text-gray-500">{c.policyCount.toLocaleString()}</td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        * 필드 값을 수정한 뒤 다른 곳을 클릭(포커스 아웃)하면 자동으로 저장됩니다.
      </p>
    </div>
  )
}
