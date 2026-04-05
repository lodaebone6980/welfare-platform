'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function MyPage() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Profile Section */}
      <div className="mb-6">
        {isLoading ? (
          <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-2xl p-6 animate-pulse">
            <div className="h-16 w-16 bg-yellow-200 rounded-full mb-3"></div>
            <div className="h-4 bg-yellow-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-yellow-200 rounded w-1/3"></div>
          </div>
        ) : session?.user ? (
          /* Logged in state */
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-4 mb-4">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt="프로필"
                  className="w-16 h-16 rounded-full border-2 border-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-400 flex items-center justify-center text-2xl">
                  {(session.user.name || '사')[0]}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{session.user.name || '사용자'}</h2>
                <p className="text-blue-100 text-sm">{session.user.email || '카카오 로그인'}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              로그아웃
            </button>
          </div>
        ) : (
          /* Logged out state */
          <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">로그인하고 맞춤 정책 받기</h2>
            <p className="text-sm text-gray-700 mb-4">
              카카오 로그인으로 나에게 맞는 정책을 추천받으세요
            </p>
            <button
              onClick={() => signIn('kakao', { callbackUrl: '/mypage' })}
              className="w-full bg-[#191919] hover:bg-[#3C1E1E] text-[#FEE500] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-base shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.03 2 1 5.13 1 8.97c0 2.44 1.57 4.59 3.93 5.86l-1 3.68c-.09.32.27.58.55.4l4.4-2.93c.37.04.74.06 1.12.06 4.97 0 9-3.13 9-6.97C19 5.13 14.97 2 10 2z" fill="#FEE500"/>
              </svg>
              카카오 로그인
            </button>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl border overflow-hidden mb-6">
        <Link href="/recommend" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <span className="font-medium text-gray-800">맞춤 정책 추천</span>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/welfare/categories" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl">📂</span>
            <span className="font-medium text-gray-800">카테고리별 보기</span>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/notifications" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <span className="font-medium text-gray-800">알림 설정</span>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link href="/welfare/search" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">❓</span>
            <span className="font-medium text-gray-800">자주 묻는 질문</span>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* App Download */}
      <div className="bg-gray-50 rounded-2xl p-5 text-center mb-6">
        <p className="text-sm text-gray-500 mb-3">더 편리한 정책지금 앱</p>
        <div className="flex gap-3 justify-center">
          <a href="#" className="flex-1 max-w-[160px] bg-black text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
            🍎 App Store
          </a>
          <a href="#" className="flex-1 max-w-[160px] bg-black text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-1.5">
            ▶ Google Play
          </a>
        </div>
      </div>

      {/* Footer info */}
      <p className="text-center text-xs text-gray-400">정책지금 v1.2.0</p>
    </div>
  );
}
