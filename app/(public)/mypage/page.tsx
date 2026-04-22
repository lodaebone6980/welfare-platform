'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function MyPage() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated' && session?.user;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 pt-8 pb-6">
        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <Image src={session.user.image} alt="" width={56} height={56} className="rounded-full border-2 border-white/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                {(session.user.name || '?')[0]}
              </div>
            )}
            <div className="flex-1">
              <p className="text-white font-bold text-lg">{session.user.name || '사용자'}</p>
              <p className="text-blue-100 text-xs">{session.user.email || ''}</p>
            </div>
            <button onClick={() => signOut()} className="px-3 py-1.5 bg-white/15 rounded-lg text-white text-xs hover:bg-white/25 transition">
              로그아웃
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-white font-bold text-lg mb-1">로그인해주세요</p>
            <p className="text-blue-100 text-xs mb-4">맞춤 정책 추천과 즐겨찾기를 이용하세요</p>
            <button onClick={() => signIn('kakao')}
              className="inline-flex items-center gap-2 bg-[#FEE500] text-[#191919] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#FDD800] transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#191919"><path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.15c-.1.36.32.64.62.43l4.94-3.28c.38.04.77.06 1.18.06 5.52 0 10-3.36 10-7.6C22 6.36 17.52 3 12 3z"/></svg>
              카카오로 로그인
            </button>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Quick Menu */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-3">빠른 메뉴</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: '📋', label: '전체 정책', href: '/welfare/search' },
              { icon: '📂', label: '카테고리', href: '/welfare/categories' },
              { icon: '🎯', label: '맞춤 추천', href: '/recommend' },
              { icon: '🔔', label: '알림', href: '/notifications' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-gray-50 transition">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[11px] text-gray-600 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Service Menu */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-900 px-4 pt-4 pb-2">서비스</h3>
          {[
            { icon: '📱', label: '앱 다운로드', desc: 'App Store / Google Play', href: '#' },
            { icon: '❓', label: '자주 묻는 질문', desc: '서비스 이용 안내', href: '#' },
            { icon: '📧', label: '문의하기', desc: '의견 및 제안', href: '#' },
            { icon: '⚙️', label: '설정', desc: '알림, 테마 등', href: '#' },
          ].map((item, idx) => (
            <Link key={idx} href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition border-t border-gray-50">
              <span className="text-xl w-8 text-center">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-[11px] text-gray-400">{item.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Info */}
        <div className="text-center py-4">
          <p className="text-[11px] text-gray-400">복지길잡이 v2.0</p>
          <p className="text-[10px] text-gray-300 mt-1">© {new Date().getFullYear()} 복지길잡이. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
