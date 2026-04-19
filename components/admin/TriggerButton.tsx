'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  source: string;
  disabled?: boolean;
};

export default function TriggerButton({ source, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/collect/${encodeURIComponent(source)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: 50, pages: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? `HTTP ${res.status}`);
      } else {
        setMsg(
          `수신 ${data.fetched}건 · 신규 ${data.created}건 · 갱신 ${data.updated}건 · ${(
            data.durationMs / 1000
          ).toFixed(1)}s`,
        );
        startTransition(() => router.refresh());
      }
    } catch (e: any) {
      setErr(e?.message ?? '네트워크 오류');
    } finally {
      setBusy(false);
    }
  }

  const running = busy || pending;

  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled || running}
        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : running
            ? 'bg-blue-400 text-white cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {running ? (
          <>
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            수집 중…
          </>
        ) : (
          <>🔄 지금 수집</>
        )}
      </button>
      {msg && (
        <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
          ✓ {msg}
        </p>
      )}
      {err && (
        <p className="mt-2 text-xs text-rose-700 bg-rose-50 rounded px-2 py-1 break-all">
          ✗ {err}
        </p>
      )}
    </div>
  );
}
