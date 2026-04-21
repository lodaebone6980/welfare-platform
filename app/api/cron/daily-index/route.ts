/**
 * GET /api/cron/daily-index
 *
 * Vercel Cron 이 매일 04:00 KST (= 19:00 UTC 전날) 에 호출.
 * Vercel 은 `Authorization: Bearer $CRON_SECRET` 헤더를 붙여서 호출함.
 *
 * 최근 24시간 내 수정된 정책만 IndexNow + Google 로 전송.
 */

import { NextResponse } from 'next/server';
import { pushAll } from '@/lib/indexing/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await pushAll({
      trigger: 'CRON_DAILY',
      sinceDays: 1, // 최근 24시간
      limit: 2_000,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
