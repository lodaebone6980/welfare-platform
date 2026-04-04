import { Sidebar } from '@/components/layout/Sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO: 프로덕션에서 NextAuth 인증 활성화
  // const session = await getServerSession()
  // if (!session) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
