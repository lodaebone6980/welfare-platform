import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  return auth === `Bearer ${secret}`;
}

export function cronUnauthorized() {
  return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const email = (session?.user?.email || '').toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = role === 'ADMIN' || role === 'admin' || adminEmails.includes(email);
  if (!session || !isAdmin) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return null;
}

export async function requireAdminOrCron(req: Request) {
  if (isCronAuthorized(req)) return null;
  return requireAdmin();
}
