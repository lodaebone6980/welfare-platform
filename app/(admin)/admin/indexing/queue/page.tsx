/**
 * /admin/indexing/queue — Naver/Daum 색인 자동화 큐 관리
 *
 * Chrome 확장(govmate-indexer) 가 이 페이지의 백엔드 큐를 풀링해
 * Naver 검색어드바이저 / Daum 페이지등록을 자동으로 클릭한다.
 */
'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type QueueRow = {
  id: number;
  url: string;
  engine: string;
  status: string;
  priority: number;
  attempts: number;
  lastError: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  policyId: number | null;
  createdAt: string;
};

type Stats = {
  ok: boolean;
  overall: Record<string, Record<string, number>>;
  today: Record<string, Record<string, number>>;
  last7d: Record<string, Record<string, number>>;
  dailyLimits: Record<string, number>;
};

const ENGINES = ['NAVER_MANUAL', 'DAUM_MANUAL'] as const;
const STATUSES = ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CAPTCHA', 'RATE_LIMITED', 'SKIPPED'] as const;

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  SUCCESS: '#10b981',
  FAILED: '#ef4444',
  CAPTCHA: '#f59e0b',
  RATE_LIMITED: '#f97316',
  SKIPPED: '#a3a3a3',
};

export default function IndexingQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filterEngine, setFilterEngine] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [autoHours, setAutoHours] = useState(24);
  const [msg, setMsg] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEngine) params.set('engine', filterEngine);
      if (filterStatus) params.set('status', filterStatus);
      if (q) params.set('q', q);
      params.set('limit', '300');
      const r = await fetch(`/api/admin/indexing-queue/list?${params.toString()}`, {
        cache: 'no-store',
      });
      const j = await r.json();
      if (j.ok) setRows(j.items);
    } finally {
      setLoading(false);
    }
  }, [filterEngine, filterStatus, q]);

  const loadStats = useCallback(async () => {
    const r = await fetch('/api/admin/indexing-queue/stats', { cache: 'no-store' });
    const j = await r.json();
    if (j.ok) setStats(j);
  }, []);

  useEffect(() => {
    loadList();
    loadStats();
    const t = setInterval(() => {
      loadList();
      loadStats();
    }, 15_000);
    return () => clearInterval(t);
  }, [loadList, loadStats]);

  const handleBulkEnqueue = async () => {
    const urls = bulkText
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('https://'));
    if (urls.length === 0) {
      setMsg('유효한 https URL 이 없습니다.');
      return;
    }
    setMsg('등록 중...');
    const r = await fetch('/api/admin/indexing-queue/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    const j = await r.json();
    setMsg(JSON.stringify(j));
    setBulkText('');
    loadList();
    loadStats();
  };

  const handleAutoEnqueue = async () => {
    setMsg('자동 등록 중...');
    const r = await fetch('/api/admin/indexing-queue/auto-enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: autoHours }),
    });
    const j = await r.json();
    setMsg(JSON.stringify(j));
    loadList();
    loadStats();
  };

  const totals = useMemo(() => {
    if (!stats) return null;
    const out: Record<string, { pending: number; success: number; failed: number; today: number; limit: number }> = {};
    for (const e of ENGINES) {
      const overall = stats.overall[e] || {};
      const today = stats.today[e] || {};
      out[e] = {
        pending: overall.PENDING || 0,
        success: overall.SUCCESS || 0,
        failed: (overall.FAILED || 0) + (overall.CAPTCHA || 0),
        today: Object.values(today).reduce((a, b) => a + b, 0),
        limit: stats.dailyLimits[e] || 0,
      };
    }
    return out;
  }, [stats]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Naver / Daum 색인 자동화 큐
      </h1>
      <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
        Chrome 확장(govmate-indexer) 이 이 큐를 자동으로 풀링해서 Naver
        검색어드바이저 / Daum 페이지등록 페이지에 자동 입력합니다. 캡차가 나오면 직접
        풀어주세요.
      </p>

      {/* 엔진별 통계 카드 */}
      {totals && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {ENGINES.map((e) => {
            const t = totals[e];
            return (
              <div
                key={e}
                style={{
                  flex: 1,
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                }}
              >
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  {e === 'NAVER_MANUAL' ? '네이버 검색어드바이저' : '다음 페이지등록'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  대기 {t.pending} / 성공 {t.success}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  오늘 {t.today}/{t.limit}건 처리 · 실패 {t.failed}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 자동 등록 + 수동 등록 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            자동 등록 (최근 발행 정책)
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 14 }}>최근</label>
            <input
              type="number"
              value={autoHours}
              min={1}
              max={720}
              onChange={(e) => setAutoHours(Number(e.target.value))}
              style={{
                width: 80,
                padding: '6px 8px',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
              }}
            />
            <label style={{ fontSize: 14 }}>시간 이내</label>
            <button
              onClick={handleAutoEnqueue}
              style={{
                marginLeft: 'auto',
                padding: '8px 14px',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              큐에 자동 등록
            </button>
          </div>
        </div>
        <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            수동 등록 (URL 한 줄에 1개)
          </h3>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="https://www.govmate.co.kr/welfare/xxx"
            style={{
              width: '100%',
              minHeight: 80,
              padding: 8,
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={handleBulkEnqueue}
            style={{
              marginTop: 8,
              padding: '8px 14px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            큐에 등록
          </button>
        </div>
      </div>

      {/* 메시지 */}
      {msg && (
        <pre
          style={{
            background: '#0f172a',
            color: '#a7f3d0',
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            marginBottom: 16,
            maxHeight: 160,
            overflow: 'auto',
          }}
        >
          {msg}
        </pre>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select
          value={filterEngine}
          onChange={(e) => setFilterEngine(e.target.value)}
          style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
        >
          <option value="">전체 엔진</option>
          {ENGINES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }}
        >
          <option value="">전체 상태</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="URL 검색"
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
          }}
        />
        <button
          onClick={() => loadList()}
          style={{
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          새로고침
        </button>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>
          {loading ? '불러오는 중…' : `${rows.length}건`}
        </span>
      </div>

      {/* 큐 테이블 */}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={th}>id</th>
              <th style={th}>엔진</th>
              <th style={th}>상태</th>
              <th style={th}>URL</th>
              <th style={th}>시도</th>
              <th style={th}>요청</th>
              <th style={th}>완료</th>
              <th style={th}>에러</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={td}>{r.id}</td>
                <td style={td}>{r.engine.replace('_MANUAL', '')}</td>
                <td style={td}>
                  <span
                    style={{
                      background: STATUS_COLOR[r.status] || '#64748b',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9' }}>
                    {r.url.replace('https://www.govmate.co.kr', '')}
                  </a>
                </td>
                <td style={td}>{r.attempts}</td>
                <td style={td}>{r.requestedAt ? new Date(r.requestedAt).toLocaleString('ko-KR') : '—'}</td>
                <td style={td}>{r.completedAt ? new Date(r.completedAt).toLocaleString('ko-KR') : '—'}</td>
                <td style={{ ...td, color: '#ef4444', fontSize: 11 }}>
                  {r.lastError ? r.lastError.slice(0, 80) : ''}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  큐가 비어 있습니다. 위에서 자동 등록을 실행해 보세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 확장 설치 가이드 */}
      <details style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          Chrome 확장 설치 가이드 (govmate-indexer)
        </summary>
        <ol style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
          <li>
            저장소에서 <code>extension/</code> 폴더를 본인 PC 로 복사
          </li>
          <li>
            크롬 → <code>chrome://extensions</code> → 우상단 "개발자 모드" ON
          </li>
          <li>"압축해제된 확장 프로그램을 로드" → 위 폴더 선택</li>
          <li>
            확장 아이콘 클릭 → "옵션" → 서버 URL 과 INDEXING_QUEUE_SECRET 입력
          </li>
          <li>
            <a href="https://searchadvisor.naver.com/console/board" target="_blank" rel="noreferrer">
              네이버 검색어드바이저
            </a>{' '}
            /{' '}
            <a href="https://register.search.daum.net/index.daum" target="_blank" rel="noreferrer">
              다음 페이지등록
            </a>{' '}
            에 미리 로그인
          </li>
          <li>확장이 5분마다 자동 풀링 → 처리 결과를 이 페이지에서 확인</li>
        </ol>
      </details>
    </div>
  );
}

const th: CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
};
const td: CSSProperties = { padding: '8px 12px', verticalAlign: 'top' };
