'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '\uD648', id: 'home' },
  { href: '/welfare/search', label: '\uAC80\uC0C9', id: 'search' },
  { href: '/recommend', label: '\uB9DE\uCDA4', id: 'recommend' },
  { href: '/notifications', label: '\uC54C\uB9BC', id: 'notify' },
  { href: '/mypage', label: '\uB9C8\uC774', id: 'mypage' },
];

const icons: Record<string, (active: boolean) => JSX.Element> = {
  home: (a) => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={a?'#2563eb':'#9ca3af'} strokeWidth={a?2.2:1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>,
  search: (a) => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={a?'#2563eb':'#9ca3af'} strokeWidth={a?2.2:1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  recommend: (a) => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={a?'#2563eb':'#9ca3af'} strokeWidth={a?2.2:1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  notify: (a) => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={a?'#2563eb':'#9ca3af'} strokeWidth={a?2.2:1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  mypage: (a) => <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={a?'#2563eb':'#9ca3af'} strokeWidth={a?2.2:1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
};

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/content') || pathname?.startsWith('/marketing')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200  safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-3xl mx-auto">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname?.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {icons[tab.id](!!isActive)}
              <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
