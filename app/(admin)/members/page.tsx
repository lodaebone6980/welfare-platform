import { prisma } from '@/lib/prisma'
import MembersClient, { type MemberRow } from './MembersClient'

/**
 * 회원 관리 — 초기 데이터를 서버에서 prefetch 해서 HTML 과 함께 내려준다.
 *   기존: CSR + useEffect fetch → 3번의 네트워크 홉(HTML → JS → /api/admin/members → DB)
 *   변경: 서버 컴포넌트가 DB 직접 조회 → 1번의 홉으로 데이터까지 포함
 */
export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getInitialMembers(): Promise<{ rows: MemberRow[]; total: number }> {
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        include: { accounts: { select: { provider: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.user.count(),
    ])
    const rows: MemberRow[] = (users as any[]).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      emailVerified: u.emailVerified ? new Date(u.emailVerified).toISOString() : null,
      createdAt: new Date(u.createdAt).toISOString(),
      providers: (u.accounts ?? []).map((a: any) => a.provider),
    }))
    return { rows, total }
  } catch {
    return { rows: [], total: 0 }
  }
}

export default async function MembersPage() {
  const { rows, total } = await getInitialMembers()
  return <MembersClient initialRows={rows} initialTotal={total} />
}
