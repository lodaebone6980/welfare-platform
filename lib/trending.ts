/**
 * lib/trending.ts
 * ------------------------------------------------------------------
 * "지금 가장 많이 보는 지원금" 트렌딩 스코어 계산기.
 *
 * 기존: orderBy viewCount DESC (lifetime views)
 *   → 오래된 정책이 누적치로 항상 상위를 차지해
 *     "유가 피해보상금" 같은 최근 급등 이슈가 묻히는 문제.
 *
 * 개선: 최근 7일 PageView + lifetime viewCount 가중합
 *   score = recent7d * RECENT_WEIGHT + lifetime
 *
 * - 최근 가속도(velocity) 반영 → 갑자기 사람 몰리는 정책 즉시 상단.
 * - lifetime 누적 + 신규 PageView 부족시 자동 fallback.
 * - 마이그레이션 불필요 (기존 PageView 모델 그대로 사용).
 */

import { prisma } from '@/lib/prisma';

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const RECENT_WEIGHT = 5; // 최근 1회 = 누적 5회 가치

/** PageView.path 에서 slug 추출. /welfare/<slug> 또는 /<category>/<slug> 지원 */
function extractSlug(path: string): string | null {
  if (!path || !path.startsWith('/')) return null;
  const parts = path.split('?')[0].split('#')[0].split('/').filter(Boolean);
  if (parts.length < 2) return null;
  // 마지막 세그먼트가 slug 로 간주
  const slug = parts[parts.length - 1];
  // 홈/목록/카테고리 페이지 배제 (search, categories 등)
  if (['search', 'categories', 'sitemap', 'about', 'contact', 'privacy', 'terms'].includes(slug)) {
    return null;
  }
  return slug;
}

export type TrendingPolicy = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  geoRegion: string | null;
  viewCount: number;
  deadline: string | null;
  category: { name: string; slug: string; icon: string | null } | null;
};

const SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  geoRegion: true,
  viewCount: true,
  deadline: true,
  category: { select: { name: true, slug: true, icon: true } },
} as const;

/**
 * 트렌딩 지원금 (최근 7일 PageView 가중 랭킹)
 * @param limit 반환 개수 (기본 6)
 */
export async function getTrendingPolicies(limit = 6): Promise<TrendingPolicy[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS);

  // 1) 최근 7일 경로별 PageView 집계
  let agg: { path: string; _count: { _all: number } }[] = [];
  try {
    const raw = await prisma.pageView.groupBy({
      by: ['path'],
      where: {
        createdAt: { gte: since },
        path: { startsWith: '/' },
      },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 300,
    });
    agg = raw as unknown as { path: string; _count: { _all: number } }[];
  } catch (err) {
    // PageView 테이블 없거나 권한 이슈 → fallback
    console.warn('[trending] pageView.groupBy failed, fallback to viewCount', err);
  }

  // 2) path → slug → recent-view-count 맵
  const slugRecent = new Map<string, number>();
  for (const row of agg) {
    const slug = extractSlug(row.path);
    if (!slug) continue;
    slugRecent.set(slug, (slugRecent.get(slug) || 0) + row._count._all);
  }

  // 3) 최근 뷰가 있는 slug 에 해당하는 정책 로드
  const slugs = Array.from(slugRecent.keys()).slice(0, 100);
  let trendingPolicies: TrendingPolicy[] = [];
  if (slugs.length > 0) {
    const rows = await prisma.policy.findMany({
      where: { status: 'PUBLISHED', slug: { in: slugs } },
      select: SELECT,
    });
    // 4) score = recent * WEIGHT + lifetime
    const scored = rows.map((p) => ({
      p,
      score: (slugRecent.get(p.slug) || 0) * RECENT_WEIGHT + (p.viewCount || 0),
    }));
    scored.sort((a, b) => b.score - a.score);
    trendingPolicies = scored.slice(0, limit).map((s) => s.p);
  }

  // 5) 부족분은 lifetime viewCount 로 채움 (신규 사이트 / PageView 부족)
  if (trendingPolicies.length < limit) {
    const exclude = new Set(trendingPolicies.map((p) => p.slug));
    const remaining = limit - trendingPolicies.length;
    const fallback = await prisma.policy.findMany({
      where: {
        status: 'PUBLISHED',
        ...(exclude.size > 0 ? { slug: { notIn: Array.from(exclude) } } : {}),
      },
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      take: remaining,
      select: SELECT,
    });
    trendingPolicies = [...trendingPolicies, ...fallback];
  }

  return trendingPolicies;
}
