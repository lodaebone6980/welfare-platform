/**
 * Chrome 확장 ↔ 서버 공유 시크릿 인증.
 *
 * 사용처:
 *   - GET  /api/indexing-queue/pull
 *   - POST /api/indexing-queue/result
 *
 * 환경변수:
 *   INDEXING_QUEUE_SECRET="아무_긴_랜덤_문자열"   ← 확장과 동일하게 설정
 */
import { NextResponse } from 'next/server';

export const QUEUE_SECRET_HEADER = 'x-indexing-secret';

export function checkQueueSecret(req: Request): NextResponse | null {
  const expected = (process.env.INDEXING_QUEUE_SECRET || '').trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, reason: 'server-misconfigured: INDEXING_QUEUE_SECRET missing' },
      { status: 500 }
    );
  }
  const got = req.headers.get(QUEUE_SECRET_HEADER) || '';
  if (got !== expected) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }
  return null;
}
