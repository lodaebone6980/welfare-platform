'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type Category = { id: number; name: string; slug: string }
type Status = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

type FormState = {
  id?: number
  title: string
  slug: string
  status: Status
  categoryId: string
  geoRegion: string
  geoDistrict: string
  excerpt: string
  content: string
  eligibility: string
  applicationMethod: string
  requiredDocuments: string
  applyUrl: string
  externalUrl: string
  deadline: string
  focusKeyword: string
  metaDesc: string
}

const STATUS_OPTIONS: Status[] = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']

function emptyState(): FormState {
  return {
    title: '',
    slug: '',
    status: 'DRAFT',
    categoryId: '',
    geoRegion: '',
    geoDistrict: '',
    excerpt: '',
    content: '',
    eligibility: '',
    applicationMethod: '',
    requiredDocuments: '',
    applyUrl: '',
    externalUrl: '',
    deadline: '',
    focusKeyword: '',
    metaDesc: '',
  }
}

function toState(policy?: any): FormState {
  if (!policy) return emptyState()
  return {
    id: policy.id,
    title: policy.title ?? '',
    slug: policy.slug ?? '',
    status: policy.status ?? 'DRAFT',
    categoryId: policy.categoryId ? String(policy.categoryId) : '',
    geoRegion: policy.geoRegion ?? '',
    geoDistrict: policy.geoDistrict ?? '',
    excerpt: policy.excerpt ?? '',
    content: policy.content ?? '',
    eligibility: policy.eligibility ?? '',
    applicationMethod: policy.applicationMethod ?? '',
    requiredDocuments: policy.requiredDocuments ?? '',
    applyUrl: policy.applyUrl ?? '',
    externalUrl: policy.externalUrl ?? '',
    deadline: policy.deadline ?? '',
    focusKeyword: policy.focusKeyword ?? '',
    metaDesc: policy.metaDesc ?? '',
  }
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildSnsUrl(slug: string, source: 'threads' | 'instagram') {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.govmate.co.kr'
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: 'social',
    utm_campaign: `policy_card_${ym}`,
    utm_content: source === 'threads' ? `${slug}-card` : `post-${slug}`,
  })
  return `${origin}/welfare/${encodeURIComponent(slug)}?${params}`
}

export default function PolicyFormClient({
  mode,
  initialPolicy,
  categories,
}: {
  mode: 'create' | 'edit'
  initialPolicy?: any
  categories: Category[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toState(initialPolicy))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const publicUrl = useMemo(() => {
    if (!form.slug) return ''
    return `/welfare/${form.slug}`
  }, [form.slug])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function payload() {
    return {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
    }
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const endpoint = mode === 'create'
        ? '/api/admin/policies'
        : `/api/admin/policies/${form.id}`
      const res = await fetch(endpoint, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setMessage('저장했습니다.')
      if (mode === 'create') {
        router.replace(`/content/policy/${data.id}/edit`)
      } else {
        router.refresh()
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!form.id) return
    if (!confirm('정말 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return
    setDeleting(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/policies/${form.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      router.replace('/content/policy')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      setDeleting(false)
    }
  }

  async function copySns(source: 'threads' | 'instagram') {
    if (!form.slug) {
      setMessage('slug를 먼저 입력해 주세요.')
      return
    }
    await navigator.clipboard.writeText(buildSnsUrl(form.slug, source))
    setMessage(`${source === 'threads' ? 'Threads' : 'Instagram'} 링크를 복사했습니다.`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1100px] mx-auto w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-800">{mode === 'create' ? '새 정책' : '정책 수정'}</h1>
          {publicUrl && <p className="text-xs text-gray-400 mt-1">{publicUrl}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => copySns('threads')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Threads 링크 복사
          </button>
          <button type="button" onClick={() => copySns('instagram')} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
            Instagram 링크 복사
          </button>
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <Field label="제목">
            <input value={form.title} onChange={e => update('title', e.target.value)} className={inputClass} />
          </Field>

          <Field label="요약">
            <textarea value={form.excerpt} onChange={e => update('excerpt', e.target.value)} rows={3} className={inputClass} />
          </Field>

          <Field label="본문">
            <textarea value={form.content} onChange={e => update('content', e.target.value)} rows={14} className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="지원대상">
              <textarea value={form.eligibility} onChange={e => update('eligibility', e.target.value)} rows={5} className={inputClass} />
            </Field>
            <Field label="신청방법">
              <textarea value={form.applicationMethod} onChange={e => update('applicationMethod', e.target.value)} rows={5} className={inputClass} />
            </Field>
          </div>

          <Field label="필요서류">
            <textarea value={form.requiredDocuments} onChange={e => update('requiredDocuments', e.target.value)} rows={4} className={inputClass} />
          </Field>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="space-y-4">
              <Field label="Slug">
                <div className="flex gap-2">
                  <input value={form.slug} onChange={e => update('slug', e.target.value)} className={inputClass} />
                  <button type="button" onClick={() => update('slug', slugify(form.title))} className="rounded-lg border border-gray-200 px-3 text-xs text-gray-600">
                    자동
                  </button>
                </div>
              </Field>
              <Field label="상태">
                <select value={form.status} onChange={e => update('status', e.target.value as Status)} className={inputClass}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="카테고리">
                <select value={form.categoryId} onChange={e => update('categoryId', e.target.value)} className={inputClass}>
                  <option value="">선택 안 함</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="지역">
                <input value={form.geoRegion} onChange={e => update('geoRegion', e.target.value)} placeholder="예: 서울" className={inputClass} />
              </Field>
              <Field label="세부 지역">
                <input value={form.geoDistrict} onChange={e => update('geoDistrict', e.target.value)} placeholder="예: 강남구" className={inputClass} />
              </Field>
              <Field label="마감일">
                <input value={form.deadline} onChange={e => update('deadline', e.target.value)} placeholder="예: 2026-12-31" className={inputClass} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="space-y-4">
              <Field label="신청 URL">
                <input value={form.applyUrl} onChange={e => update('applyUrl', e.target.value)} className={inputClass} />
              </Field>
              <Field label="출처 URL">
                <input value={form.externalUrl} onChange={e => update('externalUrl', e.target.value)} className={inputClass} />
              </Field>
              <Field label="핵심 키워드">
                <input value={form.focusKeyword} onChange={e => update('focusKeyword', e.target.value)} className={inputClass} />
              </Field>
              <Field label="SEO 설명">
                <textarea value={form.metaDesc} onChange={e => update('metaDesc', e.target.value)} rows={3} className={inputClass} />
              </Field>
            </div>
          </div>

          {mode === 'edit' && (
            <button type="button" onClick={remove} disabled={deleting} className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
