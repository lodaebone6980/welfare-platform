'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function MobileHeader() {
  const pathname = usePathname();
  const [showSearch, setShowSearch] = useState(false);

  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/content') || pathname?.startsWith('/marketing')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-xl">💰</span>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            정책지금
          </span>
        </Link>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="검색"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>
      
      {showSearch && (
        <div className="px-4 pb-3 animate-slideDown">
          <form action="/welfare/search" method="GET" className="relative">
            <input
              type="text"
              name="q"
              placeholder="정책을 검색해보세요..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 border-0 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              autoFocus
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>
        </div>
      )}
    </header>
  );
}
