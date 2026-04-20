// app/api/indexnow/route.ts
// IndexNow 프로토콜로 Bing / Yandex 에 신규·갱신 URL을 즉시 통지한다.
// Google은 공식 참여사가 아니지만 Bing 신호를 부분 공유.
//
// 호출 방식 (publish-agent 또는 admin):
//   POST /api/indexnow
//   body: { urls: string[] }
//
// 인증: 헤더 X-IndexNow-Secret 이 INDEXNOW_SHARED_SECRET 와 일치해야 함.
// secret 은 비워두면 (기본) GET 으로 단건 ping 만 허용하고 POST는 거부. 

import { NextResponse } from 'next/server';

// IndexNow 프로토콜 키 (public/{KEY}.txt 와 반드시 동일해야 함)
const INDEXNOW_KEY = 'c0685d4c0310152d5b872b826d543df7';
const HOST = 'www.govmate.co.kr';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

// 공유 시크릿 (publish-agent 가 POST 할 때 헤더로 동봉).
// env 를 쓰지 않고 코드 상수로 관리 (운영 중 노출되어도 IndexNow 키 자체는 공개이므로 피해 최소).
// 변경하려면 아래 값을 갈아끼우고 publish-agent 쪽도 동시 갱신.
const SHARED_SECRET = 'govmate-indexnow-2026-push';

type ReqBody = { urls?: string[] };

async function pingBing(urls: string[]) {
  const res = await fetch('https://www.bing.com/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  });
  return { ok: res.ok, status: res.status };
}

export async function POST(req: Request) {
  // 인증
  const secret = req.headers.get('x-indexnow-secret');
  if (secret !== SHARED_SECRET) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let body: ReqBody = {};
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-json' }, { status: 400 });
  }

  const urls = Array.isArray(body.urls) ? body.urls.filter(Boolean) : [];
  if (urls.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no-urls' }, { status: 400 });
  }

  // 같은 호스트만 허용 (prefix 검사)
  const ALLOW_PREFIX = `https://${HOST}/`;
  const invalid = urls.find((u) => !u.startsWith(ALLOW_PREFIX));
  if (invalid) {
    return NextResponse.json(
      { ok: false, reason: 'cross-host', invalid },
      { status: 400 }
    );
  }

  // IndexNow 는 POST 1회당 10,000 URL 제한. 여유있게 1,000 씩 쪼갠다.
  const CHUNK = 1000;
  const results: Array<{ ok: boolean; status: number }> = [];
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const r = await pingBing(slice);
    results.push(r);
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { ok: allOk, sent: urls.length, chunks: results.length, results },
    { status: allOk ? 200 : 502 }
  );
}

// 편의용 단건 GET: /api/indexnow?url=https://www.govmate.co.kr/welfare/xxx
// (브라우저로 손쉽게 테스트하거나 Vercel cron 에서 헬스체크용)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json(
      {
        ok: true,
        service: 'indexnow',
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        note: '단건 ping: ?url=https://www.govmate.co.kr/... (같은 호스트만 허용)',
      },
      { status: 200 }
    );
  }
  if (!url.startsWith(`https://${HOST}/`)) {
    return NextResponse.json({ ok: false, reason: 'cross-host' }, { status: 400 });
  }
  const r = await pingBing([url]);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
