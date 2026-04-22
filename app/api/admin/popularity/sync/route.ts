/**
 * /api/admin/popularity/sync  (POST)
 * ------------------------------------------------------------------
 * 관리자 페이지에서 수동으로 네이버 외부 인기도 동기화를 트리거하는 엔드포인트.
 * CRON_SECRET 불필요 (admin layout 밖에서는 접근 불가 가정).
 *
 * 한 번 호출 시 최대 300개 정책 갱신. 전체 다 채우려면 반복 호출.
 */
import { NextResponse } from 'next/server';
import { runPopularitySync } from '@/lib/external-popularity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  const result = await runPopularitySync({ batchLimit: 300 });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
