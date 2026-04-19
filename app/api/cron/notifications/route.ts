import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/notifications
 * Invoked daily (e.g. 09:00 KST) by Vercel Cron.
 * Strategy:
 *   1. Auth via CRON_SECRET header (Bearer) to prevent abuse.
 *   2. Count policies created in the last 24h.
 *   3. Count active FCM tokens.
 *   4. Fan out through lib/push/fcm (to be implemented with firebase-admin).
 * This file is a scaffold; the actual FCM fan-out is stubbed so the job is
 * idempotent and safe to enable before Firebase credentials are provisioned.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== 'Bearer ' + cronSecret) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const freshCount = await prisma.policy.count({
    where: { createdAt: { gte: since } },
  });

  const tokenCount = await prisma.fcmToken.count();

  // TODO: lib/push/fcm#sendToAll(tokens, message) once firebase-admin is wired.
  const sent = 0;

  return NextResponse.json({
    ok: true,
    since: since.toISOString(),
    freshCount,
    tokenCount,
    sent,
  });
}
