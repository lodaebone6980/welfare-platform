'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label:  string
  href?:  string
  badge?: number
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { label: '대시보드', href: '/admin' },
  {
    label: '콘텐츠',
    children: [
      { label: '정책 관리',   href: '/admin/content/policy' },
      { label: '대량 생성',   href: '/admin/content/bulk', badge: 0 },
      { label: '카테고리',    href: '/admin/content/category' },
    ],
  },
  {
    label: '데이터',
    children: [
      { label: 'API 수집현황', href: '/admin/api-status' },
      { label: '유입 분석',   href: '/admin/traffic' },
      { label: '검색 트렌딩', href: '/admin/trending' },
    ],
  },
  {
    label: '마케팅 · 광고',
    children: [
      { label: '구글광고 에이전트', href: '/admin/marketing/google-ads' },
      { label: 'Meta 광고',         href: '/admin/marketing/meta' },
      { label: '네이버 광고',       href: '/admin/marketing/naver' },
    ],
  },
  {
    label: 'SNS 관리',
    children: [
      { label: 'Threads 관리',  href: '/admin/marketing/threads',           badge: 2 },
      { label: 'Threads 성과',  href: '/admin/marketing/threads-analytics' },
      { label: '인스타그램',   href: '/admin/marketing/instagram' },
      { label: '틱톡',         href: '/admin/marketing/tiktok' },
      { label: 'N 블로그',     href: '/admin/marketing/naver-blog' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-48 min-w-48 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">
      {/* 로고 */}
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-800">정책자금넷 Admin</span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-2">
        {NAV.map((item) =>
          item.href ? (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ) : (
            <NavSection key={item.label} item={item} pathname={pathname} />
          )
        )}
      </nav>

      {/* 사이트 이동 */}
      <div className="px-4 py-3 border-t border-gray-100">
        <a
          href="/"
          target="_blank"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ↗ 사이트로 이동
        </a>
      </div>
    </aside>
  )
}

function NavSection({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <div className="mt-1">
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
        {item.label}
      </div>
      {item.children?.map(child => (
        <NavLink key={child.href} item={child} pathname={pathname} sub />
      ))}
    </div>
  )
}

function NavLink({ item, pathname, sub }: { item: NavItem; pathname: string; sub?: boolean }) {
  const active = pathname === item.href ||
    (item.href !== '/admin' && pathname.startsWith(item.href ?? '___'))

  return (
    <Link
      href={item.href ?? '#'}
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
