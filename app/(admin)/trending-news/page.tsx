/**
 * /trending-news (admin)
 * ------------------------------------------------------------------
 * 네이버 뉴스 API + 부처 RSS 에서 수집된 "최근 이슈 기반 지원금 후보"를
 * 한눈에 보여주고, 클릭 한 번으로 DRAFT Policy 등록 스텝으로 넘어갈 수 있게 한다.
 *
 * 데이터 흐름:
 *   [Naver News / Gov RSS] → collectors → 이 페이지 → "초안 등록" 클릭
 *     → POST /api/admin/trends/news/draft → Policy DRAFT 생성
 *     → /content/policy/:id/edit 로 리다이렉트 (기존 편집 UI 재사용)
 */

import { collectTrendingSupportNews, stripHtml } from '@/lib/collectors/naver-news';
import { collectGovNews } from '@/lib/collectors/gov-rss';
import TrendingNewsClient from './_components/TrendingNewsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 600; // 10분 캐시

type Candidate = {
  kind: 'naver-news' | 'gov-rss';
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
};

async function getCandidates(queries: string[]): Promise<{
  items: Candidate[];
  counts: { total: number; naver: number; gov: number };
  naverConfigured: boolean;
  govConfigured: boolean;
}> {
  const naverConfigured = Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

  const [naver, gov] = await Promise.all([
    naverConfigured
      ? collectTrendingSupportNews(queries, 30).catch((e) => {
          console.warn('[trending-news] naver failed:', e?.message);
          return [] as Awaited<ReturnType<typeof collectTrendingSupportNews>>;
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof collectTrendingSupportNews>>),
    collectGovNews().catch((e) => {
      console.warn('[trending-news] gov failed:', e?.message);
      return [] as Awaited<ReturnType<typeof collectGovNews>>;
    }),
  ]);

  const naverItems: Candidate[] = naver.map((it) => ({
    kind: 'naver-news',
    title: stripHtml(it.title),
    description: stripHtml(it.description),
    link: it.originallink || it.link,
    pubDate: it.pubDate,
    source: 'Naver News',
  }));
  const govItems: Candidate[] = gov.map((it) => ({
    kind: 'gov-rss',
    title: it.title,
    description: it.description,
    link: it.link,
    pubDate: it.pubDate,
    source: it.source,
  }));

  const items = [...govItems, ...naverItems].sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  return {
    items: items.slice(0, 100),
    counts: { total: items.length, naver: naverItems.length, gov: govItems.length },
    naverConfigured,
    govConfigured: gov.length > 0,
  };
}

export default async function TrendingNewsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const queries = (searchParams.q?.split(',').map((s) => s.trim()).filter(Boolean)) ?? [
    '지원금',
    '보조금',
    '재난지원',
    '피해지원',
    '바우처',
  ];
  const { items, counts, naverConfigured } = await getCandidates(queries);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-lg">🔥</span>
          트렌딩 뉴스 — 지원금 후보
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          최근 뉴스/부처 보도자료에서 복지 키워드로 필터링한 후보. "초안 등록"으로 Policy DRAFT 를 만들면 기존 편집 UI 에서 보완 후 발행할 수 있습니다.
        </p>
      </header>

      {!naverConfigured && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <strong>NAVER_CLIENT_ID / NAVER_CLIENT_SECRET</strong> 환경변수가 설정되지 않아 네이버 뉴스는 비활성 상태입니다. Vercel Project Settings 에서 추가 후 재배포하세요.
        </div>
      )}

      <section className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 flex flex-wrap gap-3">
        <span>검색어: <strong className="text-gray-900">{queries.join(', ')}</strong></span>
        <span className="text-gray-300">|</span>
        <span>총 {counts.total}건 (부처 {counts.gov} · 네이버 {counts.naver})</span>
      </section>

      <TrendingNewsClient items={items} />
    </div>
  );
}
