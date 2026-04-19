/**
 * app/api/notifications/pref/route.ts
 * ---------------------------------------------------------------
 * 로그인한 사용자의 알림 선호도(NotificationPref) 조회/갱신.
 *   GET  /api/notifications/pref  → { pref }
 *   PUT  /api/notifications/pref  body: { enabled, quietStart, quietEnd, categories }
 *
 * NotificationPref 가 아직 migration 되지 않은 환경에서도 터지지 않게
 * 조건부로 try/catch 처리한다.
 * ---------------------------------------------------------------
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Pref = {
  enabled: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  categories: string[] | null;
};

const defaultPref: Pref = {
  enabled: true,
  quietStart: null,
  quietEnd: null,
  categories: null,
};

async function readUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const uid = (session as unknown as { user?: { id?: string } } | null)?.user?.id;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

export async function GET() {
  const userId = await readUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  try {
    const p = await (prisma as unknown as { notificationPref: { findUnique: (args: unknown) => Promise<unknown> } }).notificationPref.findUnique({
      where: { userId },
    });
    if (!p) return NextResponse.json({ ok: true, pref: { ...defaultPref } });
    const row = p as Pref;
    return NextResponse.json({ ok: true, pref: row });
  } catch {
    return NextResponse.json({ ok: true, pref: { ...defaultPref }, degraded: true });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await readUserId();
  if (!userId) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  let body: Partial<Pref> = {};
  try {
    body = (await req.json()) as Partial<Pref>;
  } catch {
    return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
  }
  const data: Pref = {
    enabled: typeof body.enabled === 'boolean' ? body.enabled : defaultPref.enabled,
    quietStart: typeof body.quietStart === 'number' ? body.quietStart : null,
    quietEnd: typeof body.quietEnd === 'number' ? body.quietEnd : null,
    categories: Array.isArray(body.categories)
      ? body.categories.filter((x) => typeof x === 'string').slice(0, 32)
      : null,
  };
  try {
    const p = await (prisma as unknown as { notificationPref: { upsert: (args: unknown) => Promise<unknown> } }).notificationPref.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
    });
    return NextResponse.json({ ok: true, pref: p });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'PERSIST_FAILED', degraded: true }, { status: 200 });
  }
}
