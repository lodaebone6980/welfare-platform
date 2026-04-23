import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/members/export?provider=kakao&q=검색어
 * ─────────────────────────────────────────────────────────────
 * 회원 목록을 CSV (UTF-8 + BOM) 로 스트림 다운로드.
 *   - 엑셀에서 한글 깨짐 방지용 BOM 포함
 *   - 컬럼: id, email, name, role, providers, createdAt, lastLoginAt, blockedAt
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const provider = (url.searchParams.get('provider') || '').trim();

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

  const users = await prisma.user.findMany({
    where,
    include: { accounts: { select: { provider: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  const header = [
    'id',
    'email',
    'name',
    'role',
    'providers',
    'createdAt',
    'lastLoginAt',
    'blockedAt',
  ];
  const lines: string[] = [header.join(',')];

  for (const u of users as any[]) {
    const providers = (u.accounts ?? []).map((a: any) => a.provider).join('|');
    lines.push(
      [
        u.id,
        u.email ?? '',
        u.name ?? '',
        u.role,
        providers,
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
        u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '',
        u.blockedAt ? new Date(u.blockedAt).toISOString() : '',
      ].map(csvEscape).join(','),
    );
  }

  const BOM = '\uFEFF';
  const body = BOM + lines.join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `members_${stamp}.csv`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
