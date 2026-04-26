/**
 * POST /api/indexing-queue/result
 *
 * Chrome 확장이 처리 결과를 보고한다.
 * body: { id: number, status: 'SUCCESS'|'FAILED'|'CAPTCHA'|'RATE_LIMITED'|'SKIPPED', error?: string, meta?: any }
 *
 * 헤더: x-indexing-secret
 * 부수효과:
 *   - indexing_queue 행 업데이트 (status, completedAt, lastError, resultMeta)
 *   - indexing_log 행 1개 추가 (대시보드 통계 통합)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkQueueSecret } from '@/lib/indexing/queue-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FINAL_STATUSES = new Set([
  'SUCCESS',
  'FAILED',
  'CAPTCHA',
  'RATE_LIMITED',
  'SKIPPED',
]);

// IndexingLog 의 status 매핑
function toLogStatus(s: string): 'SUCCESS' | 'FAILED' | 'PARTIAL' {
  if (s === 'SUCCESS') return 'SUCCESS';
  if (s === 'SKIPPED') return 'PARTIAL';
  return 'FAILED';
}

export async function POST(req: Request) {
  const unauth = checkQueueSecret(req);
  if (unauth) return unauth;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const id = Number(body?.id);
  const status = String(body?.status || '').toUpperCase();
  const error = body?.error ? String(body.error).slice(0, 1000) : null;
  const meta = body?.meta ?? null;

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, reason: 'bad-id' }, { status: 400 });
  }
  if (!FINAL_STATUSES.has(status)) {
    return NextResponse.json(
      { ok: false, reason: 'bad-status', allowed: Array.from(FINAL_STATUSES) },
      { status: 400 }
    );
  }

  const row = await prisma.indexingQueue.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.indexingQueue.update({
      where: { id },
      data: {
        status: status as any,
        completedAt: new Date(),
        lastError: error,
        resultMeta: meta ?? undefined,
      },
    });

    // 대시보드/통계를 위해 IndexingLog 도 한 줄 남긴다
    // 기존 enum 에 EXTENSION trigger 가 없으므로 MANUAL_URL 로 분류
    await tx.indexingLog.create({
      data: {
        triggerType: 'MANUAL_URL',
        engine: row.engine,
        status: toLogStatus(status),
        urlCount: 1,
        sampleUrls: [row.url],
        errorMsg: error || undefined,
        durationMs: row.requestedAt
          ? Date.now() - new Date(row.requestedAt).getTime()
          : 0,
        meta: meta ?? undefined,
      },
    });
  });

  return NextResponse.json({ ok: true, id, status });
}
