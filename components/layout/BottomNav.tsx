'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '홈', icon: '🏠', activeIcon: '🏠' },
  { href: '/welfare/search', label: '검색', icon: '🔍', activeIcon: '🔎' },
  { href: '/welfare/categories', label: '카테고리', icon: '📋', activeIcon: '📋' },
  { href: '/more', label: '더보기', icon: '☰', activeIcon: '☰' },
];

export default function BottomNav() {
  const pathname = usePathname();
  
  // Hide on admin pages
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/content') || pathname?.startsWith('/marketing')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' 
            ? pathname === '/' 
            : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl mb-0.5">{isActive ? tab.activeIcon : tab.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
