/**
 * POST /api/indexing/push-all
 *
 * Admin 전체 인덱싱 푸시 엔드포인트.
 * Header: x-push-secret: <INDEXING_PUSH_SECRET>
 *
 * Body (optional JSON):
 *   { sinceDays?: number, limit?: number, urls?: string[] }
 */

import { NextResponse } from 'next/server';
import { pushAll } from '@/lib/indexing/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== process.env.INDEXING_PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    sinceDays?: number;
    limit?: number;
    urls?: string[];
  } = {};

  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    // body 없어도 OK
  }

  try {
    const result = await pushAll({
      trigger: 'MANUAL_ALL',
      sinceDays: body.sinceDays,
      limit: body.limit,
      urls: body.urls,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
