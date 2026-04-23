import { Sidebar } from '@/components/layout/Sidebar'

/**
 * 어드민 레이아웃.
 * 인증은 프로젝트 루트 middleware.ts 에서 JWT 토큰 기반으로 이미 처리하므로
 * 레이아웃 자체에서는 getServerSession을 호출하지 않는다.
 *   → force-dynamic 제거 → 페이지 이동시 레이아웃 재렌더링 비용 최소화.
 * 페이지별로 필요한 dynamic/revalidate 설정은 각 page.tsx에서 개별 지정한다.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
