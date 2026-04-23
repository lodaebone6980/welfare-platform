import { prisma } from '@/lib/prisma'
import MembersClient, { type MemberRow } from './MembersClient'
import MembersStats from './MembersStats'

/**
 * 회원 관리
 *   상단: 통계 카드 (CSR, /api/admin/members/stats 호출)
 *   하단: 회원 테이블 (서버 prefetch 된 초기 200건)
 *
 * 서버에서 기본 목록을 prefetch 해 첫 페인트에서 바로 테이블이 보이도록 하고,
 * 통계는 별도 CSR 로딩으로 점진 렌더.
 */
// force-dynamic 제거: 인증 쿠키로 이미 런타임 dynamic 이지만 Link prefetch 차단을 피함.
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
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      blockedAt: u.blockedAt ? new Date(u.blockedAt).toISOString() : null,
      providers: (u.accounts ?? []).map((a: any) => a.provider),
    }))
    return { rows, total }
  } catch {
    return { rows: [], total: 0 }
  }
}

export default async function MembersPage() {
  const { rows, total } = await getInitialMembers()
  return (
    <div className="space-y-6 p-6">
      <MembersStats />
      <MembersClient initialRows={rows} initialTotal={total} />
    </div>
  )
}
