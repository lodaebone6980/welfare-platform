'use client';

/**
 * app/account/notifications/page.tsx
 * ---------------------------------------------------------------
 * 사용자 알림 설정 페이지:
 *  - 브라우저 알림 권한 상태 표시
 *  - 푸시 구독(등록) on/off + localStorage optIn 토글
 *  - 서버 저장 선호도 (enabled, quiet hours) 저장/불러오기
 *
 * NotificationPref 모델이 migration 전이어도 degraded 로 렌더.
 * ---------------------------------------------------------------
 */

import { useEffect, useState, useCallback } from 'react';

type Pref = {
  enabled: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  categories: string[] | null;
};

const defaultPref: Pref = {
  enabled: true,
  quietStart: null,
  quietEnd: null,
  categories: null,
};

export default function NotificationsSettingsPage() {
  const [perm, setPerm] = useState<'default'|'granted'|'denied'|'unsupported'>('default');
  const [optIn, setOptIn] = useState(false);
  const [pref, setPref] = useState<Pref>(defaultPref);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  // 초기 상태 로드
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined') { setPerm('unsupported'); return; }
    setPerm(Notification.permission as 'default'|'granted'|'denied');
    try {
      setOptIn(window.localStorage.getItem('pushOptIn') === '1');
    } catch {}
    (async () => {
      try {
        const r = await fetch('/api/notifications/pref');
        if (r.ok) {
          const j = await r.json();
          if (j?.pref) setPref({ ...defaultPref, ...j.pref });
        }
      } catch {}
    })();
  }, []);

  const turnOn = useCallback(async () => {
    setMsg(''); setLoading(true);
    try {
      const mod = await import('@/lib/push/client');
      const r = await mod.enablePush();
      if (r.ok) {
        try { window.localStorage.setItem('pushOptIn', '1'); } catch {}
        setOptIn(true);
        setPerm('granted');
        setMsg('푸시 알림이 활성화되었습니다.');
      } else {
        setMsg('활성화 실패: ' + (r.reason || 'unknown'));
      }
    } catch {
      setMsg('활성화 중 오류가 발생했습니다.');
    } finally { setLoading(false); }
  }, []);

  const turnOff = useCallback(() => {
    try { window.localStorage.removeItem('pushOptIn'); } catch {}
    setOptIn(false);
    setMsg('이 기기에서의 자동 등록을 해제했습니다. (브라우저 권한은 설정에서 별도 해제)');
  }, []);

  const save = useCallback(async () => {
    setMsg(''); setLoading(true);
    try {
      const res = await fetch('/api/notifications/pref', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pref),
      });
      if (res.ok) {
        setMsg('저장되었습니다.');
      } else {
        setMsg('저장에 실패했습니다.');
      }
    } catch {
      setMsg('네트워크 오류로 저장에 실패했습니다.');
    } finally { setLoading(false); }
  }, [pref]);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">알림 설정</h1>
        <p className="text-sm text-neutral-600 mt-1">
          새 공고가 등록되면 브라우저 알림으로 알려드립니다.
        </p>
      </header>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">브라우저 푸시</h2>
        <p className="text-sm text-neutral-600">
          권한: <span className="font-mono">{perm}</span>
          {optIn && <span className="ml-2 text-green-700">(구독중)</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={turnOn}
            disabled={loading || perm === 'unsupported'}
            className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-50"
          >
            알림 켜기
          </button>
          <button
            onClick={turnOff}
            disabled={loading || !optIn}
            className="px-4 py-2 rounded-md border text-sm disabled:opacity-50"
          >
            알림 끄기
          </button>
        </div>
        {perm === 'unsupported' && (
          <p className="text-xs text-red-600">이 브라우저는 웹 푸시를 지원하지 않습니다.</p>
        )}
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="font-semibold">알림 수신 정책</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pref.enabled}
            onChange={(e) => setPref({ ...pref, enabled: e.target.checked })}
          />
          새 공고 일일 요약 알림 수신
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            방해 금지 시작(시)
            <input
              type="number" min={0} max={23}
              value={pref.quietStart ?? ''}
              onChange={(e) => setPref({ ...pref, quietStart: e.target.value === '' ? null : Number(e.target.value) })}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            방해 금지 종료(시)
            <input
              type="number" min={0} max={23}
              value={pref.quietEnd ?? ''}
              onChange={(e) => setPref({ ...pref, quietEnd: e.target.value === '' ? null : Number(e.target.value) })}
              className="mt-1 w-full rounded-md border px-2 py-1"
            />
          </label>
        </div>
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-black text-white text-sm disabled:opacity-50"
        >
          저장
        </button>
      </section>

      {msg && <p className="text-sm text-neutral-700">{msg}</p>}
    </main>
  );
}
