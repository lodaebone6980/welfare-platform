import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/members/stats
 * ─────────────────────────────────────────────────────────────
 * 회원관리 상단 요약 카드 + 일자별 신규 가입 시리즈를 내려준다.
 *   - totals: 전체 회원 / 최근 30일 신규 / 차단 수
 *   - byProvider: 카카오/구글/이메일/관리자 비중
 *   - daily: 최근 30일 일자별 신규 가입
 *   - kakaoBreakdown: 카카오 회원 수
 *
 * 관리자만 호출. 응답은 1분 캐시 헤더 부여.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  try {
    // 기본 카운트들은 병렬.
    const [
      total,
      newLast30d,
      blocked,
      admins,
      providerRows,
      dailyRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { role: 'BLOCKED' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.account.groupBy({
        by: ['provider'],
        _count: { _all: true },
      }),
      // PostgreSQL 전용: createdAt 을 일(day) 단위로 버킷팅해서 count.
      prisma.$queryRaw<Array<{ day: Date; c: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS c
          FROM "User"
         WHERE "createdAt" >= ${thirtyDaysAgo}
         GROUP BY 1
         ORDER BY 1 ASC
      `,
    ]);

    const byProvider: Record<string, number> = {};
    for (const row of providerRows) {
      byProvider[row.provider] = row._count._all;
    }

    // 이메일 credential(= passwordHash 있는 일반 가입자)은 Account 에 row 가 없음 →
    // 따로 카운트해서 "credentials/email" 로 합산.
    const emailOnlyUsers = await prisma.user.count({
      where: {
        accounts: { none: {} },
        passwordHash: { not: null },
      },
    });
    if (emailOnlyUsers > 0) {
      byProvider.email = (byProvider.email ?? 0) + emailOnlyUsers;
    }

    const daily = dailyRows.map((r: { day: Date; c: bigint }) => ({
      date: new Date(r.day).toISOString().slice(0, 10),
      count: Number(r.c),
    }));

    // 날짜 gap 채우기 (0 인 날도 포인트로 포함)
    const filled: { date: string; count: number }[] = [];
    const map = new Map<string, number>(daily.map((d: { date: string; count: number }) => [d.date, d.count]));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filled.push({ date: key, count: map.get(key) ?? 0 });
    }

    return NextResponse.json({
      ok: true,
      totals: { total, newLast30d, blocked, admins },
      byProvider,
      daily: filled,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'STATS_FAILED', message: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
