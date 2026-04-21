/**
 * GET /api/indexing/recent-logs?limit=20
 *
 * Admin UI 에서 사용 — 최근 N 건 인덱싱 로그 반환.
 * Header: x-push-secret: <INDEXING_PUSH_SECRET>
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== process.env.INDEXING_PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? '20');
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(100, Math.floor(limitRaw)))
    : 20;

  try {
    const logs = await prisma.indexingLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        triggerType: true,
        engine: true,
        urlCount: true,
        sampleUrls: true,
        status: true,
        httpStatus: true,
        errorMsg: true,
        durationMs: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
