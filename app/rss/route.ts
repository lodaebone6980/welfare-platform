// app/rss/route.ts
// /rss 경로를 실제 피드 /feed.xml 로 308 영구 리다이렉트.
// 일부 구형 RSS 리더와 검색엔진이 /rss 관습 경로를 우선 탐색한다.

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400;

const TARGET = 'https://www.govmate.co.kr/feed.xml';

export async function GET() {
  return NextResponse.redirect(TARGET, { status: 308 });
}

export async function HEAD() {
  return NextResponse.redirect(TARGET, { status: 308 });
}
