'use client'

import { useMemo, useState } from 'react'
import type { KrRegion } from '@/lib/regions'

type BasePolicy = {
  id: number
  slug: string
  title: string
  geoRegion: string | null
}

interface Props {
  policies: BasePolicy[]
  regions: KrRegion[]
}

export default function BulkClient({ policies, regions }: Props) {
  const [baseId, setBaseId] = useState<number | ''>('')
  const [picked, setPicked] = useState<Set<string>>(new Set(regions.map((r) => r.slug)))
  const [titleTemplate, setTitleTemplate] = useState<string>('{region} {title}')
  const [preview, setPreview] = useState<{ slug: string; title: string }[]>([])

  const base = useMemo(
    () => policies.find((p) => p.id === baseId) || null,
    [policies, baseId]
  )

  function toggle(slug: string) {
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  function compose() {
    if (!base) return setPreview([])
    const out: { slug: string; title: string }[] = []
    for (const r of regions) {
      if (!picked.has(r.slug)) continue
      const t = titleTemplate
        .replaceAll('{region}', r.short)
        .replaceAll('{regionFull}', r.name)
        .replaceAll('{title}', base.title)
      const slug = `${base.slug}-${r.slug}`.slice(0, 120)
      out.push({ slug, title: t })
    }
    setPreview(out)
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px] text-gray-600">
          대표 정책
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-[13px]"
          >
            <option value="">— 선택 —</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} · {p.title.slice(0, 60)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] text-gray-600">
          제목 템플릿
          <input
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-200 px-2 py-1.5 text-[13px] font-mono"
          />
          <span className="mt-1 block text-[10px] text-gray-400">
            토큰: {'{region}'} {'{regionFull}'} {'{title}'}
          </span>
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[12px] text-gray-600">
            지역 선택 ({picked.size}/{regions.length})
          </div>
          <div className="space-x-2 text-[11px]">
            <button
              type="button"
              onClick={() => setPicked(new Set(regions.map((r) => r.slug)))}
              className="text-blue-600 hover:underline"
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setPicked(new Set())}
              className="text-gray-400 hover:underline"
            >
              해제
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {regions.map((r) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => toggle(r.slug)}
              className={
                'rounded border px-2 py-1 text-[11px] ' +
                (picked.has(r.slug)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50')
              }
            >
              {r.short}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={compose}
          disabled={!base}
          className="rounded bg-gray-900 px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
        >
          미리보기 생성
        </button>
        <button
          type="button"
          disabled
          title="다음 PR: /api/admin/bulk-region 연결 후 활성화"
          className="rounded border border-gray-200 px-3 py-1.5 text-[12px] text-gray-400"
        >
          실행 (예정)
        </button>
      </div>

      {preview.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="mb-2 text-[12px] text-gray-600">
            미리보기 {preview.length}건
          </div>
          <ul className="divide-y divide-gray-100 rounded border border-gray-100">
            {preview.map((it) => (
              <li key={it.slug} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                <span className="truncate text-gray-800">{it.title}</span>
                <span className="ml-3 shrink-0 font-mono text-[10px] text-gray-400">
                  /welfare/{it.slug}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
