/**
 * /admin/indexing — 인덱싱 센터 (원버튼 UI)
 *
 * 실제 경로: app/(admin)/admin/indexing/page.tsx
 *
 * 기능:
 *  - 원버튼 "전체 URL 재인덱싱 푸시"
 *  - 단일 URL 수동 푸시
 *  - 최근 인덱싱 로그 테이블
 *  - Naver/Daum/Google Search Console 수동 제출 바로가기
 */

'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';

type LogRow = {
  id: string;
  triggerType: string;
  engine: string;
  urlCount: number;
  sampleUrls: string[];
  status: string;
  httpStatus: number | null;
  errorMsg: string | null;
  durationMs: number;
  createdAt: string;
};

type PushResult = {
  trigger: string;
  totalUrls: number;
  engines: {
    engine: string;
    status: string;
    httpStatus?: number;
    urlCount: number;
    sampleUrls: string[];
    errorMsg?: string;
    durationMs: number;
    meta?: Record<string, unknown>;
  }[];
  startedAt: string;
  finishedAt: string;
  overallStatus: string;
};

const SECRET_STORAGE_KEY = 'govmate_indexing_push_secret';

export default function IndexingAdminPage() {
  const [secret, setSecret] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [sinceDays, setSinceDays] = useState(30);
  const [limit, setLimit] = useState(2000);
  const [pushing, setPushing] = useState(false);
  const [lastResult, setLastResult] = useState<PushResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 세션 스토리지에서 시크릿 복원 (탭 닫으면 사라짐)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SECRET_STORAGE_KEY);
      if (saved) setSecret(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (secret) sessionStorage.setItem(SECRET_STORAGE_KEY, secret);
      else sessionStorage.removeItem(SECRET_STORAGE_KEY);
    }
  }, [secret]);

  const fetchLogs = useCallback(async () => {
    if (!secret) return;
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/indexing/recent-logs?limit=30', {
        headers: { 'x-push-secret': secret },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { logs: LogRow[] } = await res.json();
      setLogs(data.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingLogs(false);
    }
  }, [secret]);

  useEffect(() => {
    if (secret) fetchLogs();
  }, [secret, fetchLogs]);

  async function pushAll() {
    setError(null);
    setPushing(true);
    try {
      const res = await fetch('/api/indexing/push-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-push-secret': secret,
        },
        body: JSON.stringify({ sinceDays, limit }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLastResult(json as PushResult);
      await fetchLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushing(false);
    }
  }

  async function pushSingle() {
    if (!singleUrl.trim()) return;
    setError(null);
    setPushing(true);
    try {
      const res = await fetch('/api/indexing/push-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-push-secret': secret,
        },
        body: JSON.stringify({ url: singleUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setLastResult(json as PushResult);
      await fetchLogs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushing(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>🚀 인덱싱 센터</h1>
      <p style={styles.subtitle}>
        원버튼으로 Bing·Yandex·Seznam·Google 에 URL 인덱싱 요청을 전송합니다.
      </p>

      {/* 시크릿 입력 */}
      <section style={styles.card}>
        <h2 style={styles.h2}>🔑 Push Secret</h2>
        <p style={styles.muted}>
          INDEXING_PUSH_SECRET 값을 입력하세요 (탭 닫으면 사라집니다).
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="INDEXING_PUSH_SECRET"
          style={styles.input}
          autoComplete="off"
        />
      </section>

      {/* 원버튼 푸시 */}
      <section style={styles.card}>
        <h2 style={styles.h2}>🎯 전체 푸시</h2>
        <div style={styles.row}>
          <label style={styles.label}>
            최근 며칠 이내 수정된 정책
            <input
              type="number"
              value={sinceDays}
              min={1}
              max={365}
              onChange={(e) => setSinceDays(Number(e.target.value))}
              style={styles.numInput}
            />
            일
          </label>
          <label style={styles.label}>
            최대
            <input
              type="number"
              value={limit}
              min={1}
              max={10_000}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={styles.numInput}
            />
            건
          </label>
        </div>
        <button
          onClick={pushAll}
          disabled={!secret || pushing}
          style={{
            ...styles.primaryBtn,
            opacity: !secret || pushing ? 0.5 : 1,
          }}
        >
          {pushing ? '⏳ 푸시 중...' : '🚀 전체 URL 재인덱싱 푸시'}
        </button>
      </section>

      {/* 단일 URL */}
      <section style={styles.card}>
        <h2 style={styles.h2}>🔗 단일 URL 푸시</h2>
        <input
          type="url"
          value={singleUrl}
          onChange={(e) => setSingleUrl(e.target.value)}
          placeholder="https://www.govmate.co.kr/welfare/..."
          style={styles.input}
        />
        <button
          onClick={pushSingle}
          disabled={!secret || !singleUrl.trim() || pushing}
          style={{
            ...styles.secondaryBtn,
            opacity: !secret || !singleUrl.trim() || pushing ? 0.5 : 1,
          }}
        >
          단일 URL 전송
        </button>
      </section>

      {/* 에러 */}
      {error && (
        <section style={{ ...styles.card, borderColor: '#f44336' }}>
          <strong style={{ color: '#f44336' }}>❌ 에러:</strong> {error}
        </section>
      )}

      {/* 마지막 결과 */}
      {lastResult && (
        <section style={styles.card}>
          <h2 style={styles.h2}>📊 마지막 결과</h2>
          <p>
            <strong>전체 URL:</strong> {lastResult.totalUrls}건 /{' '}
            <strong>상태:</strong>{' '}
            <span style={statusColor(lastResult.overallStatus)}>
              {lastResult.overallStatus}
            </span>
          </p>
          <ul style={styles.engineList}>
            {lastResult.engines.map((r) => (
              <li key={r.engine} style={styles.engineRow}>
                <strong>{engineLabel(r.engine)}</strong>:{' '}
                <span style={statusColor(r.status)}>{r.status}</span> ·{' '}
                {r.urlCount}건 · {r.durationMs}ms
                {r.errorMsg && (
                  <div style={styles.errLine}>
                    <code>{r.errorMsg}</code>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 수동 제출 바로가기 */}
      <section style={styles.card}>
        <h2 style={styles.h2}>🧭 수동 제출 바로가기 (Naver/Daum/Google)</h2>
        <p style={styles.muted}>
          Naver 는 공식 API 가 없어서 아래 링크로 직접 방문해서 제출해야 합니다.
          주 1회 "사이트맵 재수집" 만 눌러주시면 대부분 자동 반영됩니다.
        </p>
        <div style={styles.linkGrid}>
          <a
            href="https://searchadvisor.naver.com/console/site"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Naver Search Advisor (콘솔)
          </a>
          <a
            href="https://searchadvisor.naver.com/console/board/request/submit"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Naver 웹페이지 수집 요청 (하루 50개)
          </a>
          <a
            href="https://register.search.daum.net/index.daum"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Daum 검색등록
          </a>
          <a
            href="https://search.google.com/search-console?resource_id=sc-domain:govmate.co.kr"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Google Search Console
          </a>
          <a
            href="https://www.bing.com/webmasters/"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Bing Webmaster Tools
          </a>
          <a
            href="https://webmaster.yandex.com/sites/"
            target="_blank"
            rel="noreferrer"
            style={styles.linkBtn}
          >
            🔗 Yandex Webmaster
          </a>
        </div>
      </section>

      {/* 로그 테이블 */}
      <section style={styles.card}>
        <h2 style={styles.h2}>
          📜 최근 인덱싱 로그{' '}
          <button
            onClick={fetchLogs}
            disabled={!secret || loadingLogs}
            style={styles.miniBtn}
          >
            {loadingLogs ? '⏳' : '🔄'} 새로고침
          </button>
        </h2>
        {logs.length === 0 ? (
          <p style={styles.muted}>
            {secret ? '로그가 없습니다.' : '시크릿을 입력하세요.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>시각</th>
                  <th style={styles.th}>Trigger</th>
                  <th style={styles.th}>엔진</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>URL</th>
                  <th style={styles.th}>소요</th>
                  <th style={styles.th}>에러</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={styles.td}>
                      {new Date(l.createdAt).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                      })}
                    </td>
                    <td style={styles.td}>{l.triggerType}</td>
                    <td style={styles.td}>{engineLabel(l.engine)}</td>
                    <td style={{ ...styles.td, ...statusColor(l.status) }}>
                      {l.status}
                    </td>
                    <td style={styles.td}>{l.urlCount}</td>
                    <td style={styles.td}>{l.durationMs}ms</td>
                    <td style={{ ...styles.td, maxWidth: 240 }}>
                      {l.errorMsg ? (
                        <code style={styles.errLine}>{l.errorMsg}</code>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function engineLabel(engine: string): string {
  switch (engine) {
    case 'INDEXNOW':
      return 'IndexNow (Bing/Yandex)';
    case 'GOOGLE_API':
      return 'Google API';
    case 'SITEMAP_PING':
      return 'Sitemap Ping';
    case 'NAVER_MANUAL':
      return 'Naver (수동)';
    default:
      return engine;
  }
}

function statusColor(status: string): CSSProperties {
  switch (status) {
    case 'SUCCESS':
      return { color: '#16a34a', fontWeight: 600 };
    case 'PARTIAL':
      return { color: '#ca8a04', fontWeight: 600 };
    case 'FAILED':
      return { color: '#dc2626', fontWeight: 600 };
    default:
      return { color: '#64748b' };
  }
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif',
    color: '#111',
  },
  h1: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { marginTop: 4, color: '#64748b' },
  h2: { fontSize: 18, fontWeight: 600, margin: '0 0 12px 0' },
  muted: { color: '#64748b', fontSize: 13, margin: '6px 0 12px' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 },
  label: {
    fontSize: 13,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
  },
  numInput: {
    width: 80,
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 12,
    width: '100%',
    padding: '14px 20px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    marginTop: 10,
    padding: '10px 16px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
  },
  miniBtn: {
    padding: '4px 10px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    marginLeft: 8,
  },
  engineList: { listStyle: 'none', padding: 0, margin: '12px 0 0 0' },
  engineRow: { padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  errLine: {
    display: 'inline-block',
    marginTop: 4,
    fontSize: 12,
    color: '#b91c1c',
    wordBreak: 'break-word',
  },
  linkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 8,
  },
  linkBtn: {
    display: 'block',
    padding: '10px 14px',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
    textDecoration: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
};
