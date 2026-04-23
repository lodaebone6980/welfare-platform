'use client'

import { useEffect, useState } from 'react'

type EnvCheck = {
  key: string
  present: boolean
  length: number
  hasWhitespace: boolean
  hasQuotes: boolean
  hasNewline: boolean
}

type EnvResponse = {
  ok: boolean
  runtimeEnv: string
  vercelRegion: string | null
  checkedAt: string
  total: number
  presentCount: number
  missingKeys: string[]
  issues: { key: string; hasWhitespace: boolean; hasQuotes: boolean; hasNewline: boolean }[]
  grouped: Record<string, EnvCheck[]>
}

const GROUP_LABEL: Record<string, string> = {
  naver: '네이버 (검색/뉴스)',
  auth: 'NextAuth / 카카오 / 관리자',
  db: 'Database',
  openai: 'OpenAI',
  threads: 'Threads API',
  meta: 'Meta(FB/IG) 광고',
  google_ads: 'Google Ads',
  data_gov: '공공데이터 포털',
  cron_indexing: 'Cron / Search Indexing',
  firebase: 'Firebase · FCM',
  r2: 'Cloudflare R2',
  public: 'Public 변수',
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<EnvResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/diagnostics/env', { cache: 'no-store' })
      if (!res.ok) throw new Error('진단 API 응답 실패 (' + res.status + ')')
      setData(await res.json())
    } catch (e: any) {
      setErr(e?.message ?? '진단 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-medium text-gray-800">환경변수 진단</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            실제 런타임에서 로드된 환경변수만 <span className="text-green-600 font-medium">설정됨</span> 으로 표시됩니다. 값은 노출되지 않습니다.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? '확인 중…' : '다시 확인'}
        </button>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">{err}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <InfoCard label="런타임" value={data.runtimeEnv} accent="text-gray-700" />
            <InfoCard label="Vercel 리전" value={data.vercelRegion ?? '-'} accent="text-gray-700" />
            <InfoCard label="설정됨" value={`${data.presentCount} / ${data.total}`} accent="text-green-600" />
            <InfoCard label="이슈 탐지" value={String(data.issues.length)} accent={data.issues.length > 0 ? 'text-red-600' : 'text-gray-500'} />
          </div>

          {data.issues.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <div className="text-xs font-medium text-amber-800 mb-2">⚠ 값에 공백/따옴표/줄바꿈이 포함되어 있습니다 (복사 중 실수일 가능성)</div>
              <ul className="text-xs text-amber-700 space-y-0.5">
                {data.issues.map(i => (
                  <li key={i.key}>
                    <code className="bg-amber-100 px-1 rounded">{i.key}</code>
                    {' → '}
                    {i.hasWhitespace && <span className="mr-1">앞뒤 공백</span>}
                    {i.hasQuotes && <span className="mr-1">따옴표</span>}
                    {i.hasNewline && <span className="mr-1">줄바꿈</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Object.entries(data.grouped).map(([groupKey, items]) => (
            <div key={groupKey} className="bg-white border border-gray-100 rounded-xl p-4 mb-3">
              <div className="text-xs font-medium text-gray-700 mb-2">
                {GROUP_LABEL[groupKey] ?? groupKey}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {items.map(item => (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                      item.present
                        ? 'border-green-100 bg-green-50/40'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <code className="text-gray-700 truncate mr-2">{item.key}</code>
                    {item.present ? (
                      <span className="text-green-600 font-medium whitespace-nowrap">
                        ✓ {item.length}자
                      </span>
                    ) : (
                      <span className="text-gray-400 whitespace-nowrap">— 없음</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-gray-400 mt-4 leading-relaxed">
            * 환경변수가 비어있다면 Vercel Project Settings → Environment Variables 에서 추가 후 반드시 <b>Redeploy</b> 하세요. <br />
            * 공백/따옴표가 감지되면 값에 실수로 따옴표가 포함됐을 수 있습니다. Vercel UI 에서는 따옴표 없이 값만 넣어야 합니다.
          </p>
        </>
      )}
    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4">
      <div className="text-[10px] sm:text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-base sm:text-lg font-medium ${accent ?? 'text-gray-800'}`}>{value}</div>
    </div>
  )
}
