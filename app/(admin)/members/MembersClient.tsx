'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type MemberRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  blockedAt?: string | null;
  providers: string[];
};

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
  email: '이메일',
  credentials: '관리자',
  'admin-credentials': '관리자',
};

const ROLE_LABEL: Record<string, string> = {
  USER: '일반',
  ADMIN: '관리자',
  BLOCKED: '차단',
};

type Tab = 'all' | 'kakao' | 'google' | 'email' | 'blocked';

const TABS: { key: Tab; label: string; provider?: string; role?: string }[] = [
  { key: 'all',     label: '전체' },
  { key: 'kakao',   label: '카카오',   provider: 'kakao' },
  { key: 'google',  label: '구글',     provider: 'google' },
  { key: 'email',   label: '이메일',   provider: 'email' },
  { key: 'blocked', label: '차단',     role: 'BLOCKED' },
];

export default function MembersClient({
  initialRows,
  initialTotal,
}: {
  initialRows: MemberRow[];
  initialTotal: number;
}) {
  const [rows, setRows] = useState<MemberRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [saving, setSaving] = useState<string | null>(null);

  async function load(nextTab?: Tab, nextQ?: string) {
    const t = nextTab ?? tab;
    const query = nextQ ?? q;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      const tabDef = TABS.find((x) => x.key === t);
      if (tabDef?.provider) params.set('provider', tabDef.provider);
      if (tabDef?.role) params.set('role', tabDef.role);
      params.set('limit', '500');
      const res = await fetch('/api/admin/members?' + params.toString(), {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error((await res.text()) || '불러오지 못했습니다.');
      }
      const data = await res.json();
      setRows(data.users || []);
      setTotal(data.total ?? (data.users?.length || 0));
    } catch (e: any) {
      setError(e?.message || '오류가 발생했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(id: string, role: string) {
    if (role === 'BLOCKED') {
      const ok = confirm('이 회원을 차단하시겠습니까? 로그인 세션이 즉시 해제됩니다.');
      if (!ok) return;
    }
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => (prev || []).map((u) =>
        u.id === id
          ? { ...u, role, blockedAt: role === 'BLOCKED' ? new Date().toISOString() : null }
          : u,
      ));
    } catch (e: any) {
      alert('권한 변경 실패: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(null);
    }
  }

  async function deleteMember(id: string, email: string | null) {
    const ok = confirm(
      `정말로 이 회원을 탈퇴 처리하시겠습니까?\n\n${email || id}\n\n이 작업은 되돌릴 수 없습니다.`,
    );
    if (!ok) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      setRows((prev) => prev.filter((u) => u.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e: any) {
      alert('탈퇴 처리 실패: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(null);
    }
  }

  function downloadCsv() {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    const tabDef = TABS.find((x) => x.key === tab);
    if (tabDef?.provider) params.set('provider', tabDef.provider);
    const href = '/api/admin/members/export?' + params.toString();
    window.open(href, '_blank');
  }

  const providerList = useMemo(() => {
    const s = new Set<string>();
    (rows || []).forEach((r) => r.providers.forEach((p) => s.add(p)));
    return Array.from(s);
  }, [rows]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <p className="text-sm text-gray-500">
            {loading ? '불러오는 중...' : `${total.toLocaleString()}명`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            CSV 내보내기
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              load(t.key);
            }}
            className={[
              'px-4 py-2 text-sm transition-colors border-b-2 -mb-px',
              tab === t.key
                ? 'border-blue-600 text-blue-700 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 검색 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이메일 또는 이름 검색"
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '검색 중...' : '검색'}
        </button>
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); load(undefined, ''); }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        )}
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 카카오 탭일 때 추가 안내 */}
      {tab === 'kakao' && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          카카오 로그인 회원만 표시 중입니다. 카카오톡 채널 친구 추가는{' '}
          <Link href="/settings" className="underline">설정 → 카카오 연동</Link>{' '}
          에서 OAuth scope(plusfriends) 활성화 후 로그인한 회원부터 적용됩니다.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">회원</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">로그인</th>
              <th className="px-4 py-3">가입</th>
              <th className="px-4 py-3">최근 로그인</th>
              <th className="px-4 py-3">권한</th>
              <th className="px-4 py-3">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(rows || []).map((u) => (
              <tr key={u.id} className={u.role === 'BLOCKED' ? 'bg-red-50/40' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.image} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                        {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link
                        href={`/members/${u.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {u.name || '(이름 없음)'}
                      </Link>
                      <div className="text-xs text-gray-400">{u.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {u.email || '-'}
                  {u.emailVerified && (
                    <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                      인증
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.providers.length === 0 ? (
                      <span className="text-xs text-gray-400">(없음)</span>
                    ) : (
                      u.providers.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                        >
                          {PROVIDER_LABEL[p] || p}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleString('ko-KR', {
                        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })
                    : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    disabled={saving === u.id}
                    className={[
                      'rounded-md border px-2 py-1 text-sm',
                      u.role === 'BLOCKED'
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : u.role === 'ADMIN'
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300',
                    ].join(' ')}
                  >
                    {Object.keys(ROLE_LABEL).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/members/${u.id}`}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      상세
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteMember(u.id, u.email)}
                      disabled={saving === u.id}
                      className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      탈퇴
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400">
        표시 중 로그인 방식: {providerList.length ? providerList.map((p) => PROVIDER_LABEL[p] || p).join(' · ') : '-'}
      </p>
    </div>
  );
}
