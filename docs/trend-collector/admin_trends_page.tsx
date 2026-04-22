/**
 * /admin/trends — 관리자용 트렌드 & 정책 후보 관리 페이지
 * ------------------------------------------------------------------
 * 파일 위치: app/(admin)/admin/trends/page.tsx
 *
 * 섹션:
 *   1) 오늘의 급상승 키워드 (TrendKeyword 최근 24h, source별)
 *   2) 수집된 뉴스 (NewsItem 최근 7일, 부처·매체별)
 *   3) 정책 후보 리스트 (PolicyCandidate, status=PENDING)
 *      - 각 후보에 대해 Approve / Reject / Mark as Duplicate 액션
 *      - Approve 시 관리자가 수동으로 Policy 생성 페이지로 이동 (자동 생성 X)
 *
 * Server Component + form actions 조합.
 * 인증은 기존 (admin) 레이아웃의 미들웨어에 위임.
 */

import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { CandidateStatus } from '@prisma/client';

async function approveCandidate(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await prisma.policyCandidate.update({
    where: { id },
    data: { status: CandidateStatus.APPROVED, reviewedAt: new Date() },
  });
  revalidatePath('/admin/trends');
}

async function rejectCandidate(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await prisma.policyCandidate.update({
    where: { id },
    data: { status: CandidateStatus.REJECTED, reviewedAt: new Date() },
  });
  revalidatePath('/admin/trends');
}

async function markDuplicate(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  await prisma.policyCandidate.update({
    where: { id },
    data: { status: CandidateStatus.DUPLICATE, reviewedAt: new Date() },
  });
  revalidatePath('/admin/trends');
}

export default async function AdminTrendsPage() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [risingKeywords, recentNews, candidates] = await Promise.all([
    prisma.trendKeyword.findMany({
      where: { capturedAt: { gte: oneDayAgo } },
      orderBy: { score: 'desc' },
      take: 30,
    }),
    prisma.newsItem.findMany({
      where: { publishedAt: { gte: sevenDaysAgo } },
      orderBy: { publishedAt: 'desc' },
      take: 40,
    }),
    prisma.policyCandidate.findMany({
      where: { status: CandidateStatus.PENDING },
      orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <header>
        <h1 className="text-2xl font-bold">트렌드 &amp; 정책 후보</h1>
        <p className="mt-1 text-sm text-gray-500">
          뉴스·네이버·구글 트렌드에서 포착된 신규 정책 후보입니다. 승인 시 실제 Policy 생성
          페이지로 이동합니다.
        </p>
      </header>

      {/* 1) 급상승 키워드 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">오늘의 급상승 키워드 (24h)</h2>
        {risingKeywords.length === 0 ? (
          <p className="text-sm text-gray-500">수집된 급상승 키워드가 없습니다.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {risingKeywords.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span className="truncate">
                  <strong className="mr-2">{k.keyword}</strong>
                  <span className="text-xs text-gray-400">{k.source}</span>
                </span>
                <span className="rounded bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600">
                  {k.score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2) 수집된 뉴스 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">최근 정책 관련 보도 (7일)</h2>
        {recentNews.length === 0 ? (
          <p className="text-sm text-gray-500">수집된 뉴스가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {recentNews.map((n) => (
              <li key={n.id} className="px-3 py-2 text-sm">
                <a
                  href={n.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-gray-900 hover:underline"
                >
                  {n.title}
                </a>
                <div className="mt-0.5 text-xs text-gray-400">
                  {n.agency ?? '—'} · {n.source} ·{' '}
                  {n.publishedAt.toLocaleDateString('ko-KR')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3) 정책 후보 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          정책 후보 (검토 대기: {candidates.length}건)
        </h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-500">현재 검토 대기 중인 후보가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold">{c.suggestedTitle}</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      topic: <code>{c.topic}</code> · 부처: {c.agency ?? '—'} · 트렌드 점수:{' '}
                      {c.trendScore}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">{c.summary}</p>
                    <p className="mt-2 text-xs text-gray-400">
                      관련 뉴스 {c.newsItemIds.length}건 ·{' '}
                      {c.createdAt.toLocaleDateString('ko-KR')} 생성
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 text-xs">
                    <Link
                      href={`/admin/policies/new?fromCandidate=${c.id}`}
                      className="rounded bg-orange-500 px-3 py-1 text-center font-semibold text-white hover:bg-orange-600"
                    >
                      정책 생성 →
                    </Link>
                    <form action={approveCandidate}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                      >
                        승인 표시
                      </button>
                    </form>
                    <form action={markDuplicate}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
                      >
                        중복
                      </button>
                    </form>
                    <form action={rejectCandidate}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        type="submit"
                        className="w-full rounded border border-gray-300 px-3 py-1 text-gray-500 hover:bg-gray-50"
                      >
                        반려
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
