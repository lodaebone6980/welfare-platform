'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get('callbackUrl') || '/mypage';
  const error = sp.get('error');

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          로그인
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          지원금길잡이에서 내 맞춤 혜택을 확인하세요
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </div>
        )}

        <button
          onClick={() => signIn('kakao', { callbackUrl })}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-[#FEE500] hover:bg-[#FDD835] text-[#191600] font-medium py-3 transition"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 1.5C4.86 1.5 1.5 4.17 1.5 7.47c0 2.13 1.41 4 3.54 5.07l-.9 3.3c-.08.29.23.52.48.36L8.4 14.1c.2.01.4.02.6.02 4.14 0 7.5-2.67 7.5-5.97S13.14 1.5 9 1.5z"
              fill="#191600"
            />
          </svg>
          카카오로 시작하기
        </button>

        <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
          로그인 시{' '}
          <a href="/terms" className="underline">이용약관</a>과{' '}
          <a href="/privacy-policy" className="underline">개인정보처리방침</a>에 동의한 것으로 간주됩니다.
          <br />
          <a href="/marketing-consent" className="underline">마케팅 정보 수신 동의</a>는 선택이며,
          가입 후 마이페이지 &gt; 알림 설정에서 언제든 변경할 수 있습니다.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
