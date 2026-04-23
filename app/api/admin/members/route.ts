import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const unauth = await assertAdmin();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const provider = (url.searchParams.get('provider') || '').trim();
  const role = (url.searchParams.get('role') || '').trim();   // USER | ADMIN | BLOCKED
  const limitRaw = Number(url.searchParams.get('limit') || '100');
  const limit = Math.max(1, Math.min(500, isNaN(limitRaw) ? 100 : limitRaw));

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (provider) {
    where.accounts = { some: { provider } };
  }
  if (role && ['USER', 'ADMIN', 'BLOCKED'].includes(role)) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        accounts: { select: { provider: true, providerAccountId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const sanitized = (users as any[]).map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? null,
    blockedAt: u.blockedAt ?? null,
    providers: (u.accounts ?? []).map((a: any) => a.provider),
  }));

  return NextResponse.json({ ok: true, total, users: sanitized });
}

export async function PATCH(req: Request) {
  const unauth = await assertAdmin();
  if (unauth) return unauth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }

  const { id, role } = body || {};
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ ok: false, error: 'MISSING_ID' }, { status: 400 });
  }
  const allowed = ['USER', 'ADMIN', 'BLOCKED'];
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ ok: false, error: 'INVALID_ROLE' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
