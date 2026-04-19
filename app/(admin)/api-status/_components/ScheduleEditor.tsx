'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  id: number
  name: string
  schedule?: string | null
  autoPublish?: boolean | null
  lastScheduledRun?: string | Date | null
}

const SCHEDULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '사용 안함' },
  { value: '15m', label: '15분마다' },
  { value: '30m', label: '30분마다' },
  { value: '1h', label: '1시간마다' },
  { value: '2h', label: '2시간마다' },
  { value: '6h', label: '6시간마다' },
  { value: '12h', label: '12시간마다' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
]

export default function ScheduleEditor({
  id,
  name,
  schedule,
  autoPublish,
  lastScheduledRun,
}: Props) {
  const [open, setOpen] = useState(false)
  const [sched, setSched] = useState<string>(schedule ?? '')
  const [auto, setAuto] = useState<boolean>(!!autoPublish)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const currentLabel =
    SCHEDULE_OPTIONS.find((o) => o.value === (schedule ?? ''))?.label ?? schedule ?? '사용 안함'

  async function save() {
    setErr(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/api-source/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ schedule: sched, autoPublish: auto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && data?.hint) {
          setErr(`마이그레이션 필요: ${data.hint}`)
        } else {
          setErr(data?.error || `요청 실패 (${res.status})`)
        }
        return
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      setErr(e?.message || '네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">스케줄</span>
          <span
            className={`inline-flex px-2 py-0.5 rounded ${
              schedule
                ? 'bg-indigo-50 text-indigo-700'
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            {currentLabel}
          </span>
          {autoPublish && (
            <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
              자동발행
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-gray-500 hover:text-gray-800 underline decoration-dotted"
        >
          편집
        </button>
      </div>
      {lastScheduledRun && (
        <p className="text-[11px] text-gray-400">
          마지막 자동 실행:{' '}
          {new Date(lastScheduledRun).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {name} · 스케줄 설정
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              크론 작업이 해당 주기마다 이 소스의 수집을 자동으로 호출합니다.
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">
              실행 주기
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              value={sched}
              onChange={(e) => setSched(e.target.value)}
              disabled={saving}
            >
              {SCHEDULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                disabled={saving}
                className="h-4 w-4"
              />
              자동 발행 (수집 즉시 PUBLIC 공개)
            </label>

            {err && (
              <div className="mb-4 px-3 py-2 rounded bg-rose-50 text-rose-700 text-xs">
                {err}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-md text-sm text-gray-600 hover:bg-gray-100"
                disabled={saving}
              >
                취소
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || pending}
                className="px-4 py-1.5 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
