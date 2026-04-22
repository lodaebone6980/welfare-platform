/**
 * /api/slug-to-category — middleware가 호출하는 룩업 엔드포인트
 * ------------------------------------------------------------------
 * 파일 위치: app/api/slug-to-category/route.ts
 *
 * 입력: ?slug=unemployment-benefit
 * 출력: { category: "subsidy" } 또는 404
 *
 * 캐시: s-maxage=3600 (CDN 1h), stale-while-revalidate 86400
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  const policy = await prisma.policy.findUnique({
    where: { slug },
    select: { category: true },
  });

  if (!policy?.category) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json(
    { category: policy.category },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
