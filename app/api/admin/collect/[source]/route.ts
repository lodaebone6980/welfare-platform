import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { collectBokjiro } from '@/lib/collectors/bokjiro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Map source name in the URL slug → collector function.
const COLLECTORS: Record<string, typeof collectBokjiro> = {
  bokjiro: collectBokjiro,
  복지로: collectBokjiro,
};

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  // @ts-expect-error role is augmented on the session user
  const role = session.user.role;
  if (role !== 'ADMIN' && role !== 'admin') return null;
  return session;
}

// POST /api/admin/collect/[source] — 수동 트리거
export async function POST(
  req: NextRequest,
  { params }: { params: { source: string } },
) {
  const session = await assertAdmin();
  if (!session) {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다.' },
      { status: 403 },
    );
  }

  const key = params.source.toLowerCase();
  const collector = COLLECTORS[key];
  if (!collector) {
    return NextResponse.json(
      { error: `알 수 없는 소스: ${params.source}` },
      { status: 404 },
    );
  }

  const source = await prisma.apiSource.findFirst({
    where: {
      OR: [
        { name: { equals: '복지로' } },
        { name: { contains: key, mode: 'insensitive' } },
      ],
    },
  });

  if (!source) {
    return NextResponse.json(
      { error: 'ApiSource 레코드를 찾을 수 없습니다. 마이그레이션이 적용되었는지 확인하세요.' },
      { status: 500 },
    );
  }

  const run = await prisma.collectionRun.create({
    data: {
      sourceId: source.id,
      status: 'running',
      triggeredBy: 'manual',
    },
  });

  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const result = await collector({
      rows: body?.rows ?? 50,
      pages: body?.pages ?? 1,
      publish: body?.publish ?? false,
    });

    const ok = !result.errorMsg;
    const durationMs = Date.now() - started;

    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: ok ? 'success' : 'error',
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorMsg: result.errorMsg,
        durationMs,
      },
    });

    if (ok) {
      await prisma.apiSource.update({
        where: { id: source.id },
        data: {
          lastSuccess: new Date(),
          todayCount: { increment: result.created + result.updated },
          totalCount: { increment: result.created },
        },
      });
    } else {
      await prisma.apiSource.update({
        where: { id: source.id },
        data: { lastError: new Date() },
      });
    }

    return NextResponse.json({ runId: run.id, durationMs, ...result });
  } catch (e: any) {
    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: 'error',
        errorMsg: e?.message ?? String(e),
        durationMs: Date.now() - started,
      },
    });
    await prisma.apiSource.update({
      where: { id: source.id },
      data: { lastError: new Date() },
    });
    return NextResponse.json(
      { error: e?.message ?? '수집 실패' },
      { status: 500 },
    );
  }
}

// GET /api/admin/collect/[source] — 최근 실행 이력
export async function GET(
  _req: NextRequest,
  { params }: { params: { source: string } },
) {
  const session = await assertAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const source = await prisma.apiSource.findFirst({
    where: { name: { contains: params.source, mode: 'insensitive' } },
  });
  if (!source) return NextResponse.json({ runs: [] });

  const runs = await prisma.collectionRun.findMany({
    where: { sourceId: source.id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
  return NextResponse.json({ source, runs });
}
