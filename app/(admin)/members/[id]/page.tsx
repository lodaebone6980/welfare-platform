import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import MemberDetailClient from './MemberDetailClient'

export const revalidate = 0 // 상세는 수정 즉시 반영 필요

type Props = { params: { id: string } }

async function getMember(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: { select: { provider: true, providerAccountId: true, scope: true } },
      sessions: {
        select: { expires: true },
        orderBy: { expires: 'desc' },
        take: 1,
      },
    },
  }) as any
  if (!u) return null
  return {
    id: u.id,
    email: u.email as string | null,
    name: u.name as string | null,
    image: u.image as string | null,
    role: u.role as string,
    emailVerified: u.emailVerified ? new Date(u.emailVerified).toISOString() : null,
    createdAt: new Date(u.createdAt).toISOString(),
    updatedAt: new Date(u.updatedAt).toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    blockedAt: u.blockedAt ? new Date(u.blockedAt).toISOString() : null,
    blockedReason: u.blockedReason as string | null,
    providers: (u.accounts ?? []).map((a: any) => ({
      provider: a.provider as string,
      providerAccountId: a.providerAccountId as string,
      scope: a.scope as string | null,
    })),
    latestSessionExpires: u.sessions?.[0]?.expires ? new Date(u.sessions[0].expires).toISOString() : null,
  }
}

export default async function MemberDetailPage({ params }: Props) {
  const member = await getMember(params.id)
  if (!member) notFound()

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/members" className="hover:text-blue-600 hover:underline">← 회원 목록</Link>
      </div>
      <MemberDetailClient initialMember={member} />
    </div>
  )
}
