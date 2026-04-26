/**
 * GET /api/indexing-queue/pull?engine=NAVER_MANUAL&limit=10
 *
 * Chrome 확장이 호출. PENDING 상태의 큐 항목을 batch 로 가져온다.
 * 호출 즉시 IN_PROGRESS 로 마킹하여 다른 워커가 중복 처리하지 못하게 한다.
 *
 * 헤더: x-indexing-secret (= INDEXING_QUEUE_SECRET)
 * 응답: { ok: true, items: [{ id, url, engine, attempts }] }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkQueueSecret } from '@/lib/indexing/queue-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ENGINES = new Set(['NAVER_MANUAL', 'DAUM_MANUAL']);

// 엔진별 일일 처리 한도 (확장이 폭주하지 않도록 서버 측에서 제한)
const DAILY_LIMITS: Record<string, number> = {
  NAVER_MANUAL: 50,
  DAUM_MANUAL: 30,
};

export async function GET(req: Request) {
  const unauth = checkQueueSecret(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const engine = (url.searchParams.get('engine') || '').toUpperCase();
  const limitRaw = Number(url.searchParams.get('limit') || '5');
  const limit = Math.max(1, Math.min(20, isNaN(limitRaw) ? 5 : limitRaw));

  if (!ALLOWED_ENGINES.has(engine)) {
    return NextResponse.json(
      { ok: false, reason: 'invalid-engine', allowed: Array.from(ALLOWED_ENGINES) },
      { status: 400 }
    );
  }

  // 오늘 0시
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 오늘 이미 처리한 건수(SUCCESS+IN_PROGRESS+FAILED+CAPTCHA+RATE_LIMITED) 카운트
  const consumed = await prisma.indexingQueue.count({
    where: {
      engine: engine as any,
      requestedAt: { gte: todayStart },
    },
  });

  const remaining = Math.max(0, (DAILY_LIMITS[engine] || 30) - consumed);
  if (remaining === 0) {
    return NextResponse.json({
      ok: true,
      items: [],
      reason: 'daily-limit-reached',
      dailyLimit: DAILY_LIMITS[engine],
      consumedToday: consumed,
    });
  }

  const take = Math.min(limit, remaining);

  // 트랜잭션 안에서 PENDING 을 take 만큼 잡아서 IN_PROGRESS 로 전환
  const items = await prisma.$transaction(async (tx) => {
    const pending = await tx.indexingQueue.findMany({
      where: { engine: engine as any, status: 'PENDING' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take,
    });
    if (pending.length === 0) return [];

    const ids = pending.map((p) => p.id);
    await tx.indexingQueue.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'IN_PROGRESS',
        requestedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    return pending.map((p) => ({
      id: p.id,
      url: p.url,
      engine: p.engine,
      attempts: p.attempts + 1,
    }));
  });

  return NextResponse.json({
    ok: true,
    items,
    consumedToday: consumed + items.length,
    dailyLimit: DAILY_LIMITS[engine],
  });
}
