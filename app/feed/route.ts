// app/feed/route.ts
// 네이버 서치어드바이저 / 다음 웹마스터 / Feedly 등 일부 RSS 리더·검색엔진이
// 관습적으로 /feed 경로를 먼저 탐색하므로, 실제 피드인 /feed.xml 로 308 영구
// 리다이렉트하여 동일한 RSS 2.0 문서를 제공한다.
//
// 308 Permanent Redirect 는 GET 메소드를 보존하며, 검색엔진/RSS 리더에
// "영구적으로 다른 URL 로 이동" 을 명시적으로 전달한다.

import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24h (정적 리다이렉트라 자주 바뀌지 않음)

const TARGET = 'https://www.govmate.co.kr/feed.xml';

export async function GET() {
  return NextResponse.redirect(TARGET, { status: 308 });
}

export async function HEAD() {
  return NextResponse.redirect(TARGET, { status: 308 });
}
