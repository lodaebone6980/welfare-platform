/**
 * /api/cron/external-popularity
 * 매일 새벽 실행. 공통 로직은 lib/external-popularity.runPopularitySync 로 이동.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runPopularitySync } from '@/lib/external-popularity';
import { cronUnauthorized, isCronAuthorized } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return cronUnauthorized();

  const result = await runPopularitySync({ batchLimit: 300 });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const POST = GET;
