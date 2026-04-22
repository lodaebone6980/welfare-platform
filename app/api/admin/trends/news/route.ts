/**
 * GET /api/admin/trends/news
 * ------------------------------------------------------------------
 * 관리자용: 네이버 뉴스 API + 정부 부처 RSS 를 합쳐
 * "최근 이슈 기반 지원금 후보" 리스트를 반환한다.
 *
 * 응답을 관리자 대시보드에 띄워 스탭이 1건씩 검토 후,
 * 기존 /content/policy/new 에서 draft 로 등록 → PUBLISHED 전환하는 흐름을 권장.
 *
 * 필요 환경변수:
 *   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET  (네이버 개발자센터 발급)
 *
 * Query:
 *   ?q=지원금,바우처  (쉼표로 여러 키워드)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { collectTrendingSupportNews, stripHtml } from '@/lib/collectors/naver-news';
import { collectGovNews } from '@/lib/collectors/gov-rss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await assertAdmin();
  if (!session) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q');
  const queries = q
    ? q.split(',').map((s) => s.trim()).filter(Boolean)
    : ['지원금', '보조금', '재난지원', '피해지원', '바우처'];

  // 병렬 호출
  const [naverNews, govNews] = await Promise.all([
    collectTrendingSupportNews(queries, 30).catch((e) => {
      console.warn('[trends/news] naver failed:', e.message);
      return [];
    }),
    collectGovNews().catch((e) => {
      console.warn('[trends/news] govRss failed:', e.message);
      return [];
    }),
  ]);

  const naverItems = naverNews.map((it) => ({
    kind: 'naver-news' as const,
    title: stripHtml(it.title),
    description: stripHtml(it.description),
    link: it.originallink || it.link,
    pubDate: it.pubDate,
    source: 'Naver News',
  }));

  const govItems = govNews.map((it) => ({
    kind: 'gov-rss' as const,
    title: it.title,
    description: it.description,
    link: it.link,
    pubDate: it.pubDate,
    source: it.source,
  }));

  const merged = [...govItems, ...naverItems].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return NextResponse.json({
    queries,
    count: { total: merged.length, naver: naverItems.length, gov: govItems.length },
    items: merged.slice(0, 100),
  });
}
