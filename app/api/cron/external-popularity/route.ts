/**
 * /api/cron/external-popularity
 * ------------------------------------------------------------------
 * 전체 PUBLISHED 정책에 대해 네이버 뉴스 기반 외부 인기도 점수를 갱신.
 *
 * 실행 주기 (vercel.json):
 *   매일 03:30 KST
 *
 * 방어:
 *   - Vercel Cron 헤더 x-vercel-cron, 또는 Bearer CRON_SECRET 필요
 *   - 1회 실행당 최대 N 개만 갱신 (24h 라운드 로빈)
 *   - 동시 호출 제한(3) + 사이 텀 500ms → Naver 일일 25k 쿼터 방어
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeBatchPopularity } from '@/lib/external-popularity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5분

// 한 번 실행에 처리할 최대 정책 수 (라운드 로빈)
const BATCH_LIMIT = 300;

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

  // 아직 동기화되지 않았거나 동기화가 가장 오래된 정책부터 BATCH_LIMIT 개 선택
  const policies = await prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true },
    orderBy: [
      { externalSyncedAt: 'asc' }, // 가장 오래된 것부터 (null 우선)
    ],
    take: BATCH_LIMIT,
  });

  if (policies.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, message: 'no published policies' });
  }

  const hasNaverKey =
    !!process.env.NAVER_CLIENT_ID && !!process.env.NAVER_CLIENT_SECRET;
  if (!hasNaverKey) {
    return NextResponse.json(
      { ok: false, error: 'NAVER_CLIENT_ID/SECRET not set' },
      { status: 500 },
    );
  }

  const started = Date.now();
  const scores = await computeBatchPopularity(policies, 3);

  // DB 업데이트 (betch Promise.all, 청크 50)
  const now = new Date();
  const entries = Array.from(scores.entries());
  let updated = 0;
  for (let i = 0; i < entries.length; i += 50) {
    const chunk = entries.slice(i, i + 50);
    await Promise.all(
      chunk.map(([id, score]) =>
        prisma.policy
          .update({
            where: { id },
            data: { externalScore: score, externalSyncedAt: now },
          })
          .then(() => {
            updated++;
          })
          .catch((err) => {
            console.warn('[external-popularity] update fail', id, err);
          }),
      ),
    );
  }

  return NextResponse.json({
    ok: true,
    processed: policies.length,
    updated,
    durationMs: Date.now() - started,
  });
}

// 수동 트리거 (POST 동일)
export const POST = GET;
