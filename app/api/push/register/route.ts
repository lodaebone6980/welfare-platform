import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/push/register
 * body: { token: string, platform?: 'web' | 'ios' | 'android', userAgent?: string }
 * Upserts an FcmToken row keyed by the device token. Attaches to the signed-in user
 * when available so admins can send targeted pushes later.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'INVALID_JSON' },
      { status: 400 },
    );
  }

  const token: string = (body?.token || '').trim();
  const platform: string = (body?.platform || 'web').slice(0, 16);
  const userAgent: string = (body?.userAgent || '').slice(0, 512);

  if (!token || token.length < 20) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_TOKEN' },
      { status: 400 },
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  const saved = await prisma.fcmToken.upsert({
    where: { token },
    create: {
      token,
      platform,
      userAgent,
      userId: userId || undefined,
    },
    update: {
      platform,
      userAgent,
      userId: userId || undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}

/**
 * DELETE /api/push/register?token=...
 * Removes a token (used when the user disables notifications).
 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get('token') || '').trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_TOKEN' },
      { status: 400 },
    );
  }
  await prisma.fcmToken.deleteMany({ where: { token } });
  return NextResponse.json({ ok: true });
}
