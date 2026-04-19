/**
 * GET /api/cron/notifications
 * ---------------------------------------------------------------
 * Vercel Cron 에서 호출되는 일일 다이제스트 엔드포인트.
 * - 인증: Authorization: Bearer <CRON_SECRET> 헤더 필수
 * - 최근 24h 신규/수정된 정책 수를 집계
 * - notificationPref.enabled=true 유저 중 fcmToken 보유자만 대상
 * - lib/push/fcm.ts 의 sendToTokens 로 fan-out 후 결과 반환
 * - 무효 토큰은 자동 삭제
 * ---------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToTokens } from '@/lib/push/fcm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 개발환경: 보호 미설정이면 허용
  const h = req.headers.get('authorization') || '';
  return h === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1) 최근 24h 신규/업데이트된 공개 정책 집계
  const [freshCount, sample] = await Promise.all([
    prisma.policy.count({
      where: {
        status: 'PUBLISHED' as any,
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      },
    }),
    prisma.policy.findMany({
      where: {
        status: 'PUBLISHED' as any,
        OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 1,
      select: { title: true, slug: true },
    }),
  ]);

  // 2) 알림 ON + 토큰 보유자 추출
  //    notificationPref 모델 사용(선택). 없으면 모든 토큰에 fan-out.
  let tokens: string[] = [];
  try {
    const prefs = await (prisma as any).notificationPref.findMany({
      where: { enabled: true, dailyDigest: true },
      select: { userId: true },
    });
    const userIds = prefs.map((p: { userId: string }) => p.userId);
    if (userIds.length > 0) {
      const t = await prisma.pushToken.findMany({
        where: { userId: { in: userIds } },
        select: { token: true },
      });
      tokens = t.map((r: { token: string }) => r.token);
    }
  } catch {
    // notificationPref 모델이 아직 마이그레이션 전이면 전체 토큰으로 fallback
    const t = await prisma.pushToken.findMany({ select: { token: true } });
    tokens = t.map((r: { token: string }) => r.token);
  }

  // 3) fan-out (자격증명이 없으면 내부적으로 전량 skipped 처리됨)
  if (freshCount === 0 || tokens.length === 0) {
    return NextResponse.json({
      ok: true,
      since: since.toISOString(),
      freshCount,
      tokenCount: tokens.length,
      sent: 0,
      skipped: tokens.length,
    });
  }

  const titleLine =
    freshCount === 1
      ? `오늘 새 지원 정책이 1건 업데이트 되었어요`
      : `오늘 새 지원 정책이 ${freshCount}건 업데이트 되었어요`;
  const bodyLine = sample[0]?.title ?? '지금 확인해 보세요 →';
  const link = sample[0]?.slug
    ? `https://www.govmate.co.kr/policies/${sample[0].slug}`
    : 'https://www.govmate.co.kr/';

  const res = await sendToTokens(tokens, {
    title: titleLine,
    body: bodyLine,
    url: link,
    data: { type: 'daily_digest', count: String(freshCount) },
  });

  // 4) 무효 토큰 정리
  if (res.invalidTokens.length > 0) {
    await prisma.pushToken
      .deleteMany({ where: { token: { in: res.invalidTokens } } })
      .catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    since: since.toISOString(),
    freshCount,
    tokenCount: tokens.length,
    sent: res.sent,
    skipped: res.skipped,
    invalid: res.invalidTokens.length,
  });
}
