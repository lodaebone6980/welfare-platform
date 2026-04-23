import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * /api/admin/members/[id]
 * ─────────────────────────────────────────────────────────────
 *   GET     회원 상세 (프로필 + 연결된 계정 + 세션 + 최근 로그인)
 *   PATCH   역할 변경 / 차단 / 차단해제 / 이름·메모 수정
 *   DELETE  회원 탈퇴 (hard delete, Account/Session 은 onDelete:Cascade 로 함께 삭제)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== 'ADMIN') {
    return {
      err: NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 }),
      session: null,
    };
  }
  return { err: null, session };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      accounts: {
        select: { provider: true, providerAccountId: true, scope: true },
      },
      sessions: {
        select: { expires: true },
        orderBy: { expires: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLoginAt: (user as any).lastLoginAt ?? null,
      blockedAt: (user as any).blockedAt ?? null,
      blockedReason: (user as any).blockedReason ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      providers: user.accounts.map((a: { provider: string; providerAccountId: string; scope: string | null }) => ({
        provider: a.provider,
        providerAccountId: a.providerAccountId,
        scope: a.scope,
      })),
      latestSessionExpires: user.sessions[0]?.expires ?? null,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const { role, name, blockedReason } = body ?? {};
  const data: Record<string, unknown> = {};

  if (role !== undefined) {
    const allowed = ['USER', 'ADMIN', 'BLOCKED'];
    if (!allowed.includes(role)) {
      return NextResponse.json({ ok: false, error: 'INVALID_ROLE' }, { status: 400 });
    }
    data.role = role;
    // BLOCKED 로 전환 시 blockedAt 기록, 해제 시 clear
    if (role === 'BLOCKED') {
      data.blockedAt = new Date();
      // BLOCKED 유저의 세션을 모두 끊기 위해 Session row 삭제
      try {
        await prisma.session.deleteMany({ where: { userId: params.id } });
      } catch {
        // ignore
      }
    } else {
      data.blockedAt = null;
      if (blockedReason === undefined) data.blockedReason = null;
    }
  }
  if (typeof name === 'string') data.name = name.slice(0, 120);
  if (typeof blockedReason === 'string') data.blockedReason = blockedReason.slice(0, 500);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'NO_FIELDS' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: data as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'UPDATE_FAILED', message: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { err, session } = await assertAdmin();
  if (err) return err;

  // 관리자가 자기 자신을 탈퇴시키는 실수 방지
  if ((session!.user as any)?.id === params.id) {
    return NextResponse.json(
      { ok: false, error: 'CANNOT_DELETE_SELF', message: '자기 자신은 탈퇴 처리할 수 없습니다.' },
      { status: 400 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'DELETE_FAILED', message: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
