/**
 * /api/cron/external-popularity
 * 매일 새벽 실행. 공통 로직은 lib/external-popularity.runPopularitySync 로 이동.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runPopularitySync } from '@/lib/external-popularity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron')) return true;
  const auth = req.headers.get('authorization') || '';
  const token = process.env.CRON_SECRET;
  if (token && auth === `Bearer ${token}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const result = await runPopularitySync({ batchLimit: 300 });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const POST = GET;
