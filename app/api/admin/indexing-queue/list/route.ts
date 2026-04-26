/**
 * GET /api/admin/indexing-queue/list?engine=NAVER_MANUAL&status=PENDING&limit=100
 *
 * 어드민 화면용 큐 조회. NextAuth ADMIN 권한 필요.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const unauth = await assertAdmin();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const engine = (url.searchParams.get('engine') || '').toUpperCase();
  const status = (url.searchParams.get('status') || '').toUpperCase();
  const q = (url.searchParams.get('q') || '').trim();
  const limitRaw = Number(url.searchParams.get('limit') || '100');
  const limit = Math.max(1, Math.min(500, isNaN(limitRaw) ? 100 : limitRaw));

  const where: any = {};
  if (engine && ['NAVER_MANUAL', 'DAUM_MANUAL', 'INDEXNOW', 'GOOGLE_API', 'SITEMAP_PING'].includes(engine)) {
    where.engine = engine;
  }
  if (status && ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'CAPTCHA', 'RATE_LIMITED', 'SKIPPED'].includes(status)) {
    where.status = status;
  }
  if (q) {
    where.url = { contains: q };
  }

  const items = await prisma.indexingQueue.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  });

  return NextResponse.json({ ok: true, count: items.length, items });
}
