'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

// 숨겨진 관리자 로그인 — 공개 /login 에서 접근 불가. URL 직접 접근만.
// robots.txt 에 /access/admin 차단 권장.

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const callbackUrl = sp.get('callbackUrl') || '/admin';

  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);

    const res = await signIn('admin-credentials', {
      email: id,
      password: pw,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      setErr('ID 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    router.replace(res.url || callbackUrl);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
      >
        <h1 className="text-base font-semibold text-gray-900 mb-1 text-center">
          Admin Access
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6">
          Authorized personnel only
        </p>

        {err && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <label className="block text-xs text-gray-600 mb-1">ID</label>
        <input
          type="text"
          autoComplete="username"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
          required
        />

        <label className="block text-xs text-gray-600 mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-gray-900"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 text-white text-sm font-medium py-2.5 hover:bg-black transition disabled:opacity-60"
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </main>
  );
}

export default function AdminAccessPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
