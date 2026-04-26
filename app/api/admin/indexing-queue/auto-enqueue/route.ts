/**
 * POST /api/admin/indexing-queue/auto-enqueue
 *
 * 최근 발행된 정책을 자동으로 큐에 넣는다.
 * body: { hours?: number, engines?: string[], priority?: number }
 *   - hours 기본 24
 *   - engines 기본 ['NAVER_MANUAL', 'DAUM_MANUAL']
 *
 * publishedAt 또는 updatedAt 이 윈도우 안에 들어오는 PUBLISHED 정책만 대상.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_ENGINES = ['NAVER_MANUAL', 'DAUM_MANUAL'] as const;
const ALLOWED_ENGINES = new Set(['NAVER_MANUAL', 'DAUM_MANUAL']);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr').replace(/\/$/, '');

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const unauth = await assertAdmin();
  if (unauth) return unauth;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 body 허용 */
  }

  const hours = Math.max(1, Math.min(720, Number(body?.hours) || 24));
  const engines = (Array.isArray(body?.engines) && body.engines.length > 0
    ? body.engines
    : DEFAULT_ENGINES
  )
    .map((e: any) => String(e).toUpperCase())
    .filter((e: string) => ALLOWED_ENGINES.has(e));
  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;

  if (engines.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no-valid-engines' }, { status: 400 });
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const recent = await prisma.policy.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [{ updatedAt: { gte: since } }, { publishedAt: { gte: since } }],
    },
    select: { id: true, slug: true },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  });

  if (recent.length === 0) {
    return NextResponse.json({
      ok: true,
      windowHours: hours,
      candidates: 0,
      inserted: 0,
      skipped: 0,
    });
  }

  let inserted = 0;
  let skipped = 0;
  let reactivated = 0;

  for (const p of recent) {
    if (!p.slug) continue;
    const url = `${SITE}/welfare/${encodeURIComponent(p.slug)}`;
    for (const engine of engines) {
      const existing = await prisma.indexingQueue.findUnique({
        where: { url_engine: { url, engine: engine as any } },
      });
      if (!existing) {
        await prisma.indexingQueue.create({
          data: {
            url,
            engine: engine as any,
            status: 'PENDING',
            priority,
            policyId: p.id,
          },
        });
        inserted++;
      } else if (existing.status === 'SUCCESS') {
        // 이미 한번 성공한 URL 은 정책 갱신이 있을 때만 재요청
        await prisma.indexingQueue.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            attempts: 0,
            lastError: null,
            requestedAt: null,
            completedAt: null,
            resultMeta: undefined,
          },
        });
        reactivated++;
      } else {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    windowHours: hours,
    engines,
    candidates: recent.length,
    inserted,
    reactivated,
    skipped,
  });
}
