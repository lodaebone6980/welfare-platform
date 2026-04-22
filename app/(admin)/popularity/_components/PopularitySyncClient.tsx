'use client';

import { useState } from 'react';

type Result = {
  ok: boolean;
  processed: number;
  updated: number;
  durationMs: number;
  error?: string;
};

export default function PopularitySyncClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/popularity/sync', { method: 'POST' });
      const data = (await res.json()) as Result;
      setResult(data);
      setHistory((h) => [data, ...h].slice(0, 5));
    } catch (err) {
      setResult({
        ok: false,
        processed: 0,
        updated: 0,
        durationMs: 0,
        error: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className={
          'px-4 py-2 rounded-lg text-sm font-medium text-white ' +
          (loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700')
        }
      >
        {loading ? '동기화 중… (1~3분 소요)' : '지금 300건 갱신하기'}
      </button>

      {result && (
        <div
          className={
            'mt-3 text-xs rounded-lg p-3 ' +
            (result.ok
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200')
          }
        >
          {result.ok ? (
            <>
              ✅ 완료 — 조회 <b>{result.processed}</b>건 / 업데이트{' '}
              <b>{result.updated}</b>건 ·{' '}
              {(result.durationMs / 1000).toFixed(1)}초
            </>
          ) : (
            <>❌ 실패 — {result.error}</>
          )}
        </div>
      )}

      {history.length > 1 && (
        <ul className="mt-3 text-[11px] text-gray-500 space-y-0.5">
          {history.slice(1).map((h, i) => (
            <li key={i}>
              · {h.ok ? '성공' : '실패'} / 처리 {h.processed} · 업데이트{' '}
              {h.updated} · {(h.durationMs / 1000).toFixed(1)}초
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
