/**
 * Google Indexing API 클라이언트
 *
 * 공식 API: https://indexing.googleapis.com/v3/urlNotifications:publish
 *
 * ⚠️ 주의: Google 공식적으로 JobPosting / BroadcastEvent 타입만 지원.
 * 일반 콘텐츠 URL 도 HTTP 200 응답을 주지만 Google 이 실제 인덱싱하지 않을 수
 * 있음. 그래도 호출 자체는 시도 가치가 있고, 향후 정책 변경 시 자동 이득.
 *
 * 인증: Service Account (JWT → access_token 교환 → Bearer)
 *
 * 환경변수:
 *   GOOGLE_INDEXING_CLIENT_EMAIL
 *   GOOGLE_INDEXING_PRIVATE_KEY  (줄바꿈은 \n 이스케이프된 형태)
 */

import type { EngineResult } from './types';

const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/indexing';

function normalizePrivateKey(raw: string): string {
  // Vercel UI 에서 넣을 때 줄바꿈 처리가 환경마다 다름
  return raw.replace(/\\n/g, '\n');
}

/** base64url 인코딩 */
function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Service Account JWT 생성 */
async function createJwt(clientEmail: string, privateKey: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now,
    })
  );
  const input = `${header}.${payload}`;

  // crypto.sign 로 RS256 서명
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(input);
  sign.end();
  const signature = sign.sign(privateKey);
  return `${input}.${b64url(signature)}`;
}

/** JWT 로 access_token 교환 */
async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  const keyRaw = process.env.GOOGLE_INDEXING_PRIVATE_KEY;
  if (!email || !keyRaw) throw new Error('GOOGLE_INDEXING_* env vars missing');

  const key = normalizePrivateKey(keyRaw);
  const jwt = await createJwt(email, key);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Access token missing in response');
  return json.access_token;
}

/**
 * URL 목록을 Google Indexing API 로 전송.
 * 배치 API 는 없음 (단건 호출). 100 req / 병렬 8 정도로 제한.
 */
export async function submitToGoogle(urls: string[]): Promise<EngineResult> {
  const start = Date.now();

  if (!process.env.GOOGLE_INDEXING_CLIENT_EMAIL || !process.env.GOOGLE_INDEXING_PRIVATE_KEY) {
    return {
      engine: 'GOOGLE_API',
      status: 'FAILED',
      urlCount: urls.length,
      sampleUrls: urls.slice(0, 10),
      errorMsg:
        'Google Indexing API 비활성 상태 (GOOGLE_INDEXING_* env 미설정). IndexNow + Sitemap 으로 커버됨.',
      durationMs: Date.now() - start,
    };
  }

  if (urls.length === 0) {
    return {
      engine: 'GOOGLE_API',
      status: 'SUCCESS',
      urlCount: 0,
      sampleUrls: [],
      durationMs: Date.now() - start,
    };
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    return {
      engine: 'GOOGLE_API',
      status: 'FAILED',
      urlCount: urls.length,
      sampleUrls: urls.slice(0, 10),
      errorMsg: e instanceof Error ? e.message : String(e),
      durationMs: Date.now() - start,
    };
  }

  const uniq = Array.from(new Set(urls.filter((u) => u.startsWith('https://'))));
  let ok = 0;
  let lastErr: string | undefined;
  let lastHttp = 0;

  // 병렬 8개 제한
  const CONCURRENCY = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < uniq.length) {
      const url = uniq[cursor++];
      try {
        const res = await fetch(PUBLISH_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, type: 'URL_UPDATED' }),
        });
        lastHttp = res.status;
        if (res.ok) {
          ok++;
        } else {
          const text = await res.text().catch(() => '');
          lastErr = `HTTP ${res.status}: ${text.slice(0, 200)}`;
        }
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const status = ok === uniq.length ? 'SUCCESS' : ok > 0 ? 'PARTIAL' : 'FAILED';
  return {
    engine: 'GOOGLE_API',
    status,
    httpStatus: lastHttp || undefined,
    urlCount: uniq.length,
    sampleUrls: uniq.slice(0, 10),
    errorMsg: lastErr,
    durationMs: Date.now() - start,
    meta: { ok, total: uniq.length },
  };
}
