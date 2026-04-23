'use client';

import { useEffect, useState } from 'react';

type Stats = {
  totals: { total: number; newLast30d: number; blocked: number; admins: number };
  byProvider: Record<string, number>;
  daily: { date: string; count: number }[];
};

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
  email: '이메일',
  credentials: '관리자',
  'admin-credentials': '관리자',
};

const PROVIDER_COLOR: Record<string, string> = {
  kakao: 'bg-yellow-400',
  google: 'bg-red-400',
  email: 'bg-blue-400',
  credentials: 'bg-gray-500',
  'admin-credentials': 'bg-gray-500',
};

export default function MembersStats() {
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/members/stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || '통계를 불러오지 못했습니다.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        통계 로드 실패: {err}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  const totalProv = Object.values(data.byProvider).reduce((a, b) => a + b, 0) || 1;
  const providerEntries = Object.entries(data.byProvider).sort((a, b) => b[1] - a[1]);
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.count));

  return (
    <div className="space-y-5">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 회원"      value={data.totals.total}       color="text-gray-800" />
        <StatCard label="최근 30일 신규" value={data.totals.newLast30d}  color="text-emerald-600" />
        <StatCard label="관리자"         value={data.totals.admins}      color="text-blue-600" />
        <StatCard label="차단 회원"      value={data.totals.blocked}     color="text-red-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 가입 경로별 비중 */}
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-700">가입 경로별 비중</h3>
          <div className="mt-3 space-y-2">
            {providerEntries.length === 0 && (
              <p className="text-xs text-gray-400">연결된 계정이 없습니다.</p>
            )}
            {providerEntries.map(([p, c]) => {
              const pct = Math.round((c / totalProv) * 100);
              return (
                <div key={p}>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{PROVIDER_LABEL[p] || p}</span>
                    <span>{c.toLocaleString()}명 · {pct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${PROVIDER_COLOR[p] || 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 일자별 신규 가입 (최근 30일) */}
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-700">일자별 신규 가입 (최근 30일)</h3>
          <div className="mt-3 flex h-28 items-end gap-[2px]">
            {data.daily.map((d) => {
              const h = Math.round((d.count / maxDaily) * 100);
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.count}명`}
                  className="flex-1 rounded-t bg-blue-400/70 hover:bg-blue-500 transition-colors"
                  style={{ height: `${Math.max(2, h)}%` }}
                />
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            최고: {maxDaily.toLocaleString()}명/일 · 총{' '}
            {data.daily.reduce((a, b) => a + b.count, 0).toLocaleString()}명 신규
          </p>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}
