'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const res = await signIn('admin-credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setErr('이메일 또는 비밀번호가 올바르지 않습니다.');
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-sm border"
      >
        <h1 className="text-lg font-bold mb-1">관리자 로그인</h1>
        <p className="text-xs text-gray-500 mb-5">
          정책지금 어드민 콘솔
        </p>

        <label className="block mb-3">
          <span className="text-xs text-gray-600">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            required
            autoComplete="username"
          />
        </label>

        <label className="block mb-4">
          <span className="text-xs text-gray-600">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            required
            autoComplete="current-password"
          />
        </label>

        {err && (
          <div className="text-xs text-red-500 mb-3">{err}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>

        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          ADMIN_BOOT_EMAIL / ADMIN_BOOT_PASSWORD 환경변수로
          초기 계정을 만들 수 있습니다. 운영 단계에서는 DB 기반
          계정으로 전환하세요.
        </p>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-6">로딩…</div>}>
      <LoginForm />
    </Suspense>
  );
}
