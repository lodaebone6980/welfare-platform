'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: number
  name: string
  slug: string
  icon: string | null
  displayOrder: number
  _count?: { policies: number }
}

export default function CategoryList({ initial }: { initial: Category[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', icon: '', displayOrder: 0 })
  const [showNew, setShowNew] = useState(false)

  const reload = () => startTransition(() => router.refresh())

  async function saveNew() {
    if (!form.name || !form.slug) { alert('이름과 slug는 필수입니다'); return }
    const res = await fetch('/api/admin/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { alert('저장 실패: ' + (await res.text())); return }
    setForm({ name: '', slug: '', icon: '', displayOrder: 0 })
    setShowNew(false)
    reload()
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/admin/category/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { alert('수정 실패: ' + (await res.text())); return }
    setEditing(null)
    reload()
  }

  async function remove(id: number, name: string, count: number) {
    if (count > 0) { alert(`"${name}"에 정책 ${count}건이 연결되어 삭제 불가`); return }
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/admin/category/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('삭제 실패: ' + (await res.text())); return }
    reload()
  }

  async function move(id: number, delta: number) {
    const res = await fetch(`/api/admin/category/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveBy: delta }),
    })
    if (!res.ok) { alert('순서 변경 실패'); return }
    reload()
  }

  function startEdit(c: Category) {
    setEditing(c.id)
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', displayOrder: c.displayOrder })
    setShowNew(false)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-700">카테고리 목록</div>
        <button
          onClick={() => { setShowNew(!showNew); setEditing(null); setForm({ name: '', slug: '', icon: '', displayOrder: initial.length }) }}
          className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showNew ? '취소' : '+ 새 카테고리'}
        </button>
      </div>

      {showNew && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="grid grid-cols-12 gap-2 text-xs items-center">
            <input className="col-span-3 px-2 py-1.5 border border-gray-200 rounded" placeholder="이름 (예: 환급금)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="col-span-3 px-2 py-1.5 border border-gray-200 rounded" placeholder="slug (예: refund)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            <input className="col-span-3 px-2 py-1.5 border border-gray-200 rounded" placeholder="아이콘 이모지 (💰)" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
            <input type="number" className="col-span-1 px-2 py-1.5 border border-gray-200 rounded" placeholder="순서" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            <button onClick={saveNew} className="col-span-2 px-3 py-1.5 bg-green-600 text-white rounded">저장</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-2 font-normal w-10">순서</th>
              <th className="text-left px-4 py-2 font-normal">아이콘</th>
              <th className="text-left px-4 py-2 font-normal">이름</th>
              <th className="text-left px-4 py-2 font-normal">slug</th>
              <th className="text-right px-4 py-2 font-normal">정책 수</th>
              <th className="text-right px-4 py-2 font-normal">액션</th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">카테고리가 없습니다. 위의 "+ 새 카테고리"로 추가하세요.</td></tr>
            ) : initial.map((c, idx) => (
              <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                {editing === c.id ? (
                  <>
                    <td className="px-4 py-2"><input type="number" className="w-14 px-1 py-0.5 border rounded" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></td>
                    <td className="px-4 py-2"><input className="w-12 px-1 py-0.5 border rounded" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} /></td>
                    <td className="px-4 py-2"><input className="w-full px-1 py-0.5 border rounded" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></td>
                    <td className="px-4 py-2"><input className="w-full px-1 py-0.5 border rounded" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></td>
                    <td className="px-4 py-2 text-right text-gray-400">{c._count?.policies ?? 0}</td>
                    <td className="px-4 py-2 text-right space-x-1">
                      <button onClick={() => saveEdit(c.id)} className="px-2 py-0.5 bg-green-600 text-white rounded">저장</button>
                      <button onClick={() => setEditing(null)} className="px-2 py-0.5 bg-gray-200 rounded">취소</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-gray-400">
                      <div className="flex flex-col">
                        <button disabled={idx === 0 || isPending} onClick={() => move(c.id, -1)} className="text-[10px] disabled:opacity-30">▲</button>
                        <span className="text-center">{c.displayOrder}</span>
                        <button disabled={idx === initial.length - 1 || isPending} onClick={() => move(c.id, 1)} className="text-[10px] disabled:opacity-30">▼</button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-lg">{c.icon || '—'}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono">{c.slug}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-medium ${(c._count?.policies ?? 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {(c._count?.policies ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right space-x-1">
                      <button onClick={() => startEdit(c)} className="px-2 py-0.5 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-200">수정</button>
                      <button onClick={() => remove(c.id, c.name, c._count?.policies ?? 0)} className="px-2 py-0.5 border border-gray-200 rounded hover:bg-red-50 hover:border-red-200 text-red-600">삭제</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isPending && <div className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">반영 중...</div>}
    </div>
  )
}
