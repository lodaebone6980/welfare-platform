'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  label:  string
  href?:  string
  badge?: number
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { label: '대시보드', href: '/dashboard' },
  {
    label: '콘텐츠',
    children: [
      { label: '정책 관리',   href: '/content/policy' },
      { label: '대량 생성',   href: '/content/bulk' },
      { label: '카테고리',    href: '/content/category' },
    ],
  },
  {
    label: '데이터',
    children: [
      { label: 'API 수집현황', href: '/api-status' },
      { label: '유입 분석',   href: '/traffic' },
      { label: '검색 트렌딩', href: '/trending' },
      { label: '트렌딩 뉴스', href: '/trending-news' },
      { label: '외부 인기도',  href: '/popularity' },
      { label: '환경 진단',   href: '/diagnostics' },
    ],
  },
  {
    label: '마케팅 · 광고',
    children: [
      { label: '구글광고 에이전트', href: '/marketing/google-ads' },
      { label: 'Meta 광고',         href: '/marketing/meta' },
      { label: '네이버 광고',       href: '/marketing/naver' },
    ],
  },
  {
    label: 'SNS 관리',
    children: [
      { label: 'Threads 관리',  href: '/marketing/threads',           badge: 2 },
      { label: 'Threads 성과',  href: '/marketing/threads-analytics' },
      { label: '인스타그램',   href: '/marketing/instagram' },
      { label: '틱톡',         href: '/marketing/tiktok' },
      { label: 'N 블로그',     href: '/marketing/naver-blog' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
        aria-label="메뉴 열기"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 모바일 오버레이 */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-56 min-w-56 bg-white border-r border-gray-100
        flex flex-col overflow-y-auto
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* 로고 */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-800">복지길잡이 Admin</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-2">
          {NAV.map((item) =>
            item.href ? (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
            ) : (
              <NavSection key={item.label} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
            )
          )}
        </nav>

        {/* 사이트 이동 */}
        <div className="px-4 py-3 border-t border-gray-100">
          <a href="/" target="_blank" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ↗ 사이트로 이동
          </a>
        </div>
      </aside>
    </>
  )
}

function NavSection({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate: () => void }) {
  return (
    <div className="mt-1">
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        {item.label}
      </div>
      {item.children?.map(child => (
        <NavLink key={child.href} item={child} pathname={pathname} sub onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function NavLink({ item, pathname, sub, onNavigate }: { item: NavItem; pathname: string; sub?: boolean; onNavigate: () => void }) {
  const active = pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href ?? '___'))

  return (
    <Link
      href={item.href ?? '#'}
      onClick={onNavigate}
      className={[
        'flex items-center gap-2 py-1.5 text-xs transition-colors',
        sub ? 'pl-5 pr-3' : 'px-4',
        active
          ? 'bg-green-50 text-green-700 font-medium'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
      ].join(' ')}
    >
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  )
}
