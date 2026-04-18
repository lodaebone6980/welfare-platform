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

type PreviewRow = { regionSlug: string; regionName: string; slug: string; title: string }
type ResultState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'done'
      created: { id: number; slug: string; title: string; regionSlug: string }[]
      skipped: { slug: string; reason: string }[]
      errors: { slug: string; error: string }[]
    }

export default function BulkClient({ policies, regions }: Props) {
  const [baseId, setBaseId] = useState<number | ''>('')
  const [picked, setPicked] = useState<Set<string>>(new Set(regions.map((r) => r.slug)))
  const [titleTemplate, setTitleTemplate] = useState<string>('{region} {title}')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ResultState>({ kind: 'idle' })

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

  async function callApi(dryRun: boolean) {
    if (!base) return
    const regionSlugs = Array.from(picked)
    if (regionSlugs.length === 0) return
    setResult({ kind: 'loading' })
    try {
      const res = await fetch('/api/admin/bulk-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseId: base.id,
          regionSlugs,
          titleTemplate,
          dryRun,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        if (dryRun && Array.isArray(json.plans)) {
          setPreview(json.plans)
          setResult({ kind: 'idle' })
          return
        }
        setResult({ kind: 'error', message: json.error || `HTTP ${res.status}` })
        return
      }
      if (dryRun) {
        setPreview(Array.isArray(json.plans) ? json.plans : [])
        setResult({ kind: 'idle' })
      } else {
        setResult({
          kind: 'done',
          created: json.created || [],
          skipped: json.skipped || [],
          errors: json.errors || [],
        })
      }
    } catch (err: any) {
      setResult({ kind: 'error', message: String(err?.message || err) })
    }
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
          onClick={() => callApi(true)}
          disabled={!base || picked.size === 0 || result.kind === 'loading'}
          className="rounded border border-gray-300 px-3 py-1.5 text-[12px] text-gray-700 disabled:opacity-40"
        >
          미리보기
        </button>
        <button
          type="button"
          onClick={() => {
            if (!base) return
            if (!confirm(`DRAFT 상태로 ${picked.size}건을 실제 생성합니다. 진행할까요?`)) return
            callApi(false)
          }}
          disabled={!base || picked.size === 0 || result.kind === 'loading'}
          className="rounded bg-gray-900 px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
        >
          {result.kind === 'loading' ? '처리중…' : '실행'}
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

      {result.kind === 'error' && (
        <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
          실패: {result.message}
        </div>
      )}

      {result.kind === 'done' && (
        <div className="mt-4 space-y-2 rounded border border-green-200 bg-green-50 p-3 text-[12px] text-green-800">
          <div className="font-medium">
            생성 {result.created.length}건 · 건너뜀 {result.skipped.length}건 · 오류 {result.errors.length}건
          </div>
          {result.created.length > 0 && (
            <ul className="list-disc pl-5 text-green-900/90">
              {result.created.slice(0, 10).map((c) => (
                <li key={c.id}>
                  #{c.id} · <code className="font-mono">/welfare/{c.slug}</code>
                </li>
              ))}
              {result.created.length > 10 && (
                <li className="text-green-700">…외 {result.created.length - 10}건</li>
              )}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="list-disc pl-5 text-rose-700">
              {result.errors.map((e) => (
                <li key={e.slug}>
                  <code className="font-mono">{e.slug}</code>: {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
