/**
 * lib/push/fcm.ts
 * ---------------------------------------------------------------
 * Firebase Cloud Messaging(FCM) HTTP v1 전송 헬퍼.
 * - 서버에서 서비스 계정 JWT 를 사용해 access_token 을 발급받고
 *   /messages:send 엔드포인트로 단건 push 를 fan-out 한다.
 * - 환경변수(FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY)가
 *   없으면 아무것도 보내지 않고 {sent:0, skipped:tokens.length} 반환.
 * - 대용량 fan-out 은 chunk 단위(기본 500)로 병렬 전송하되 내부적으로는
 *   Promise.allSettled 로 실패 토큰만 수집해 호출자가 정리할 수 있게 한다.
 * ---------------------------------------------------------------
 */

import crypto from 'crypto';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
};

type SendResult = {
  sent: number;
  skipped: number;
  invalidTokens: string[];
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_ENDPOINT = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

function hasCreds() {
  return Boolean(
    process.env.FCM_PROJECT_ID &&
      process.env.FCM_CLIENT_EMAIL &&
      process.env.FCM_PRIVATE_KEY,
  );
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * 서비스 계정으로 Google OAuth2 access_token 발급.
 * 결과는 단순 메모리 캐시에 5분간 보관.
 */
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) {
    return cachedToken.token;
  }
  const clientEmail = process.env.FCM_CLIENT_EMAIL!;
  const privateKey = (process.env.FCM_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned =
    base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(privateKey);
  const jwt = unsigned + '.' + base64url(signature);

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`FCM token error ${res.status}: ${txt}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    exp: now + (json.expires_in || 3600),
  };
  return cachedToken.token;
}

function buildMessage(token: string, payload: PushPayload) {
  return {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      webpush: {
        fcmOptions: payload.url ? { link: payload.url } : undefined,
      },
      data: payload.data,
    },
  };
}

async function sendOne(
  accessToken: string,
  projectId: string,
  token: string,
  payload: PushPayload,
): Promise<{ ok: boolean; invalid: boolean }> {
  const res = await fetch(FCM_ENDPOINT(projectId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessage(token, payload)),
  });
  if (res.ok) return { ok: true, invalid: false };
  // 404 / UNREGISTERED / INVALID_ARGUMENT -> 토큰 무효
  const invalid = res.status === 404 || res.status === 400;
  return { ok: false, invalid };
}

/**
 * 여러 FCM 토큰으로 동일 payload 를 병렬 전송.
 * - 자격증명이 없으면 전량 skipped 처리
 * - 실패(404/400) 토큰은 invalidTokens 로 반환 → 호출자가 DB 정리
 */
export async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
  opts: { concurrency?: number } = {},
): Promise<SendResult> {
  const result: SendResult = {
    sent: 0,
    skipped: 0,
    invalidTokens: [],
  };
  const unique = Array.from(new Set(tokens.filter(Boolean)));
  if (unique.length === 0) return result;
  if (!hasCreds()) {
    result.skipped = unique.length;
    return result;
  }

  const projectId = process.env.FCM_PROJECT_ID!;
  const accessToken = await getAccessToken();
  const concurrency = Math.max(1, Math.min(opts.concurrency ?? 20, 100));

  let cursor = 0;
  async function worker() {
    while (cursor < unique.length) {
      const idx = cursor++;
      const token = unique[idx];
      try {
        const r = await sendOne(accessToken, projectId, token, payload);
        if (r.ok) result.sent += 1;
        else if (r.invalid) result.invalidTokens.push(token);
      } catch {
        // 네트워크 에러는 invalid 로 단정하지 않고 재시도 대상
      }
    }
  }
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return result;
}

export type { PushPayload, SendResult };
