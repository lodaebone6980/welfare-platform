/**
 * GET /api/admin/indexing-queue/stats
 *
 * 큐 + 오늘 처리량 요약. 어드민 화면 헤더 카드용.
 */
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

export async function GET() {
  const unauth = await assertAdmin();
  if (unauth) return unauth;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [byEngineStatus, todayProcessed, last7d] = await Promise.all([
    prisma.indexingQueue.groupBy({
      by: ['engine', 'status'],
      _count: { _all: true },
    }),
    prisma.indexingQueue.groupBy({
      by: ['engine', 'status'],
      where: { requestedAt: { gte: todayStart } },
      _count: { _all: true },
    }),
    prisma.indexingQueue.groupBy({
      by: ['engine', 'status'],
      where: {
        completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _count: { _all: true },
    }),
  ]);

  // 모양 정리
  const shape = (rows: any[]) => {
    const out: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const e = r.engine as string;
      const s = r.status as string;
      out[e] ||= {};
      out[e][s] = r._count._all;
    }
    return out;
  };

  return NextResponse.json({
    ok: true,
    overall: shape(byEngineStatus),
    today: shape(todayProcessed),
    last7d: shape(last7d),
    dailyLimits: { NAVER_MANUAL: 50, DAUM_MANUAL: 30 },
  });
}
