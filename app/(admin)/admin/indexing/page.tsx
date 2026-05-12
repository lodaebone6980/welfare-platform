'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'

type LogRow = {
  id: string
  triggerType: string
  engine: string
  urlCount: number
  sampleUrls: string[]
  status: string
  httpStatus: number | null
  errorMsg: string | null
  durationMs: number
  createdAt: string
}

type PushResult = {
  trigger: string
  totalUrls: number
  engines: {
    engine: string
    status: string
    httpStatus?: number
    urlCount: number
    sampleUrls: string[]
    errorMsg?: string
    durationMs: number
    meta?: Record<string, unknown>
  }[]
  startedAt: string
  finishedAt: string
  overallStatus: string
}

export default function IndexingAdminPage() {
  const [singleUrl, setSingleUrl] = useState('')
  const [sinceDays, setSinceDays] = useState(30)
  const [limit, setLimit] = useState(2000)
  const [pushing, setPushing] = useState(false)
  const [lastResult, setLastResult] = useState<PushResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/admin/indexing/recent-logs?limit=30')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setLogs(data.logs ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  async function pushAll() {
    setError(null)
    setPushing(true)
    try {
      const res = await fetch('/api/admin/indexing/push-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays, limit }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setLastResult(json as PushResult)
      await fetchLogs()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPushing(false)
    }
  }

  async function pushSingle() {
    if (!singleUrl.trim()) return
    setError(null)
    setPushing(true)
    try {
      const res = await fetch('/api/admin/indexing/push-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: singleUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setLastResult(json as PushResult)
      await fetchLogs()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPushing(false)
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Indexing Manager</h1>
      <p style={styles.subtitle}>
        Admin session protected indexing controls. The browser no longer stores INDEXING_PUSH_SECRET.
      </p>

      <section style={styles.card}>
        <h2 style={styles.h2}>Bulk push</h2>
        <div style={styles.row}>
          <label style={styles.label}>
            Recent days
            <input
              type="number"
              value={sinceDays}
              min={1}
              max={365}
              onChange={(e) => setSinceDays(Number(e.target.value))}
              style={styles.numInput}
            />
          </label>
          <label style={styles.label}>
            Limit
            <input
              type="number"
              value={limit}
              min={1}
              max={10_000}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={styles.numInput}
            />
          </label>
        </div>
        <button
          onClick={pushAll}
          disabled={pushing}
          style={{ ...styles.primaryBtn, opacity: pushing ? 0.5 : 1 }}
        >
          {pushing ? 'Pushing...' : 'Push updated URLs'}
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>Single URL</h2>
        <input
          type="url"
          value={singleUrl}
          onChange={(e) => setSingleUrl(e.target.value)}
          placeholder="https://www.govmate.co.kr/welfare/..."
          style={styles.input}
        />
        <button
          onClick={pushSingle}
          disabled={!singleUrl.trim() || pushing}
          style={{ ...styles.secondaryBtn, opacity: !singleUrl.trim() || pushing ? 0.5 : 1 }}
        >
          Push URL
        </button>
      </section>

      {error && (
        <section style={{ ...styles.card, borderColor: '#f44336' }}>
          <strong style={{ color: '#f44336' }}>Error:</strong> {error}
        </section>
      )}

      {lastResult && (
        <section style={styles.card}>
          <h2 style={styles.h2}>Last result</h2>
          <p>
            <strong>Total:</strong> {lastResult.totalUrls} /{' '}
            <strong>Status:</strong>{' '}
            <span style={statusColor(lastResult.overallStatus)}>
              {lastResult.overallStatus}
            </span>
          </p>
          <ul style={styles.engineList}>
            {lastResult.engines.map((r) => (
              <li key={r.engine} style={styles.engineRow}>
                <strong>{engineLabel(r.engine)}</strong>: <span style={statusColor(r.status)}>{r.status}</span>{' '}
                {r.urlCount} URLs / {r.durationMs}ms
                {r.errorMsg && <div style={styles.errLine}><code>{r.errorMsg}</code></div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={styles.card}>
        <h2 style={styles.h2}>Manual console links</h2>
        <div style={styles.linkGrid}>
          <a href="https://searchadvisor.naver.com/console/site" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Naver Search Advisor
          </a>
          <a href="https://searchadvisor.naver.com/console/board/request/submit" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Naver URL request
          </a>
          <a href="https://register.search.daum.net/index.daum" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Daum registration
          </a>
          <a href="https://search.google.com/search-console?resource_id=sc-domain:govmate.co.kr" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Google Search Console
          </a>
          <a href="https://www.bing.com/webmasters/" target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Bing Webmaster Tools
          </a>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.h2}>
          Recent logs{' '}
          <button onClick={fetchLogs} disabled={loadingLogs} style={styles.miniBtn}>
            {loadingLogs ? 'Loading' : 'Refresh'}
          </button>
        </h2>
        {logs.length === 0 ? (
          <p style={styles.muted}>No indexing logs yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Time</th>
                  <th style={styles.th}>Trigger</th>
                  <th style={styles.th}>Engine</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>URLs</th>
                  <th style={styles.th}>Duration</th>
                  <th style={styles.th}>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={styles.td}>{new Date(l.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                    <td style={styles.td}>{l.triggerType}</td>
                    <td style={styles.td}>{engineLabel(l.engine)}</td>
                    <td style={{ ...styles.td, ...statusColor(l.status) }}>{l.status}</td>
                    <td style={styles.td}>{l.urlCount}</td>
                    <td style={styles.td}>{l.durationMs}ms</td>
                    <td style={{ ...styles.td, maxWidth: 240 }}>
                      {l.errorMsg ? <code style={styles.errLine}>{l.errorMsg}</code> : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function engineLabel(engine: string): string {
  switch (engine) {
    case 'INDEXNOW':
      return 'IndexNow'
    case 'GOOGLE_API':
      return 'Google API'
    case 'SITEMAP_PING':
      return 'Sitemap Ping'
    case 'NAVER_MANUAL':
      return 'Naver manual'
    default:
      return engine
  }
}

function statusColor(status: string): CSSProperties {
  switch (status) {
    case 'SUCCESS':
      return { color: '#16a34a', fontWeight: 600 }
    case 'PARTIAL':
      return { color: '#ca8a04', fontWeight: 600 }
    case 'FAILED':
      return { color: '#dc2626', fontWeight: 600 }
    default:
      return { color: '#64748b' }
  }
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif',
    color: '#111',
  },
  h1: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { marginTop: 4, color: '#64748b' },
  h2: { fontSize: 18, fontWeight: 600, margin: '0 0 12px 0' },
  muted: { color: '#64748b', fontSize: 13, margin: '6px 0 12px' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  numInput: { width: 80, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 },
  primaryBtn: { marginTop: 12, width: '100%', padding: '14px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { marginTop: 10, padding: '10px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  miniBtn: { padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginLeft: 8 },
  engineList: { listStyle: 'none', padding: 0, margin: '12px 0 0 0' },
  engineRow: { padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  errLine: { display: 'inline-block', marginTop: 4, fontSize: 12, color: '#b91c1c', wordBreak: 'break-word' },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 },
  linkBtn: { display: 'block', padding: '10px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', textDecoration: 'none' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
}
