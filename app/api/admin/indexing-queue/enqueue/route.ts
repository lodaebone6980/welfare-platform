/**
 * POST /api/admin/indexing-queue/enqueue
 *
 * 어드민이 수동으로 큐에 URL 을 등록한다.
 * body: { urls: string[], engines?: ('NAVER_MANUAL'|'DAUM_MANUAL')[], priority?: number, policyId?: number }
 *
 * - engines 미지정 시 ['NAVER_MANUAL', 'DAUM_MANUAL'] 양쪽에 모두 등록
 * - 동일 (url, engine) 이 이미 PENDING 이면 skip
 * - SUCCESS 였으면 새로 PENDING 으로 다시 enqueue (재요청 가능)
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_ENGINES = ['NAVER_MANUAL', 'DAUM_MANUAL'] as const;
const ALLOWED_ENGINES = new Set(['NAVER_MANUAL', 'DAUM_MANUAL']);
const SITE_PREFIX = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.govmate.co.kr').replace(/\/$/, '') + '/';

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

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const rawUrls = Array.isArray(body?.urls) ? body.urls : [];
  const urls: string[] = Array.from(
    new Set(
      rawUrls
        .map((u: any) => String(u || '').trim())
        .filter((u: string) => u.startsWith(SITE_PREFIX))
    )
  );

  const engines = (Array.isArray(body?.engines) && body.engines.length > 0
    ? body.engines
    : DEFAULT_ENGINES
  )
    .map((e: any) => String(e).toUpperCase())
    .filter((e: string) => ALLOWED_ENGINES.has(e));

  const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 0;
  const policyId = Number.isFinite(Number(body?.policyId)) ? Number(body.policyId) : null;

  if (urls.length === 0) {
    return NextResponse.json(
      { ok: false, reason: 'no-valid-urls', sitePrefix: SITE_PREFIX },
      { status: 400 }
    );
  }
  if (engines.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no-valid-engines' }, { status: 400 });
  }

  let inserted = 0;
  let reactivated = 0;

  for (const url of urls) {
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
            policyId: policyId ?? undefined,
          },
        });
        inserted++;
      } else if (existing.status === 'SUCCESS' || existing.status === 'FAILED' || existing.status === 'SKIPPED') {
        // 종료 상태면 다시 PENDING 으로 되돌려서 재요청 가능하게
        await prisma.indexingQueue.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING',
            priority,
            attempts: 0,
            lastError: null,
            requestedAt: null,
            completedAt: null,
            resultMeta: undefined,
            policyId: policyId ?? existing.policyId,
          },
        });
        reactivated++;
      }
      // PENDING/IN_PROGRESS/CAPTCHA/RATE_LIMITED 는 그대로 둔다
    }
  }

  return NextResponse.json({
    ok: true,
    urls: urls.length,
    engines,
    inserted,
    reactivated,
  });
}
