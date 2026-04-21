/**
 * POST /api/indexing/push-url
 *
 * 단일 URL 인덱싱 푸시 (Admin 또는 Publish Hook 용).
 * Header: x-push-secret: <INDEXING_PUSH_SECRET>
 * Body: { url: string, trigger?: 'MANUAL_URL' | 'PUBLISH_HOOK' }
 */

import { NextResponse } from 'next/server';
import { pushUrl } from '@/lib/indexing/push';
import { SITE_ORIGIN } from '@/lib/indexing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = req.headers.get('x-push-secret');
  if (!secret || secret !== process.env.INDEXING_PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { url?: string; trigger?: 'MANUAL_URL' | 'PUBLISH_HOOK' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body.url?.trim();
  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // 안전: 같은 오리진 만 허용
  let url = raw;
  if (url.startsWith('/')) url = `${SITE_ORIGIN}${url}`;
  if (!url.startsWith(SITE_ORIGIN)) {
    return NextResponse.json(
      { error: `url must start with ${SITE_ORIGIN}` },
      { status: 400 }
    );
  }

  try {
    const result = await pushUrl(url, body.trigger ?? 'MANUAL_URL');
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
