'use client';

import { useEffect, useMemo, useState } from 'react';

export type MemberRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: string;
  emailVerified: string | null;
  createdAt: string;
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

export default function MembersClient({
  initialRows,
  initialTotal,
}: {
  initialRows: MemberRow[];
  initialTotal: number;
}) {
  // 서버에서 prefetch 된 데이터를 초기값으로 사용 → 흰 화면 없음
  const [rows, setRows] = useState<MemberRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (provider) params.set('provider', provider);
      params.set('limit', '200');
      const res = await fetch('/api/admin/members?' + params.toString(), {
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || '회원 목록을 불러오지 못했습니다.');
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

  // 초기 로드는 서버에서 이미 완료. 검색/필터 입력 시에만 refetch.
  // (하위호환을 위해 q/provider 변경 감지 useEffect 는 두지 않고 submit 시에만 load)

  async function updateRole(id: string, role: string) {
    setSaving(id);
    try {
      const res = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      setRows((prev) =>
        (prev || []).map((u) => (u.id === id ? { ...u, role } : u))
      );
    } catch (e: any) {
      alert('권한 변경 실패: ' + (e?.message || 'unknown'));
    } finally {
      setSaving(null);
    }
  }

  const providers = useMemo(() => {
    const s = new Set<string>();
    (rows || []).forEach((r) => r.providers.forEach((p) => s.add(p)));
    return Array.from(s);
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <p className="text-sm text-gray-500">
            총 {total.toLocaleString()}명의 회원이 가입되어 있습니다.
          </p>
        </div>
      </header>

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
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 로그인 방식</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABEL[p] || p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? '불러오는 중...' : '검색'}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">회원</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">로그인</th>
              <th className="px-4 py-3">가입일</th>
              <th className="px-4 py-3">권한</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(rows || []).map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.image}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                        {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">
                        {u.name || '(이름 없음)'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {u.id.slice(0, 8)}
                      </div>
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
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    disabled={saving === u.id}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                  >
                    {Object.keys(ROLE_LABEL).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  아직 가입된 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
