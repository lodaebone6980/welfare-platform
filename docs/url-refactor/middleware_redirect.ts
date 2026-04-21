/**
 * middleware.ts — /welfare/:slug 를 DB에서 category 찾아 /:category/:slug 로 301
 * ------------------------------------------------------------------
 * 파일 위치: middleware.ts (프로젝트 루트)
 *
 * Edge Runtime에서 Prisma 직접 호출이 어려우므로 Vercel KV 또는 간단한
 * Edge-compatible fetch 방식을 권장한다. 아래는 Next.js Route Handler로
 * `/api/slug-to-category`를 두고 middleware에서 fetch해 캐시하는 구조.
 *
 * 캐싱: Redis/Upstash 또는 Next.js `unstable_cache`를 사용할 수 있음.
 * 여기서는 in-memory Map + 6시간 TTL로 최소 구현.
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  // /welfare/anything-here 만 타겟. _next, api, public은 자동 제외됨.
  matcher: ['/welfare/:slug*'],
};

// Edge global memory cache (워커 재시작 시 초기화됨, OK — 드물게 일어남)
const slugCache = new Map<string, { category: string; at: number }>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function resolveCategory(slug: string, origin: string): Promise<string | null> {
  const hit = slugCache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.category;

  try {
    const res = await fetch(`${origin}/api/slug-to-category?slug=${encodeURIComponent(slug)}`, {
      // Edge fetch는 next 옵션으로 재검증 주기를 줄 수 있음
      next: { revalidate: 60 * 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { category?: string };
    if (!data.category) return null;
    slugCache.set(slug, { category: data.category, at: Date.now() });
    return data.category;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const m = url.pathname.match(/^\/welfare\/([^/]+)\/?$/);
  if (!m) return NextResponse.next();

  const slug = m[1];
  const category = await resolveCategory(slug, url.origin);

  if (!category) {
    // slug가 DB에 없으면 목록 페이지로 301 (404보다 UX 좋음)
    const dest = new URL('/policies', url);
    return NextResponse.redirect(dest, 301);
  }

  const dest = new URL(`/${category}/${slug}`, url);
  return NextResponse.redirect(dest, 301);
}
