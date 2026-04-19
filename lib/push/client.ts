/**
 * lib/push/client.ts
 * ---------------------------------------------------------------
 * 브라우저 사이드 FCM 연동 헬퍼.
 * - Service Worker 등록 (/firebase-messaging-sw.js)
 * - postMessage 로 서비스워커에 Firebase config 전달
 * - getToken 으로 FCM 등록 토큰 발급
 * - /api/push/register 에 토큰 등록
 *
 * NEXT_PUBLIC_* 변수가 하나라도 비어있으면 no-op 으로 동작한다.
 * 서버사이드 렌더 도중 실행되어도 안전하도록 window 가드 처리.
 * ---------------------------------------------------------------
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
} from 'firebase/messaging';

export type FcmClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

function readConfig(): FcmClientConfig | null {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  for (const v of Object.values(cfg)) {
    if (!v || typeof v !== 'string') return null;
  }
  return cfg as FcmClientConfig;
}

function readVapidKey(): string | null {
  const k = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  return typeof k === 'string' && k.length > 0 ? k : null;
}

let appRef: FirebaseApp | null = null;
let messagingRef: Messaging | null = null;
let swRegRef: ServiceWorkerRegistration | null = null;

async function ensureMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (messagingRef) return messagingRef;
  const cfg = readConfig();
  if (!cfg) return null;
  try {
    const ok = await isSupported();
    if (!ok) return null;
  } catch {
    return null;
  }
  appRef = getApps()[0] || initializeApp(cfg);
  messagingRef = getMessaging(appRef);
  return messagingRef;
}

async function ensureServiceWorker(
  cfg: FcmClientConfig,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
    return null;
  }
  if (swRegRef) return swRegRef;
  try {
    const reg = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' },
    );
    await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'FCM_CONFIG', config: cfg });
    swRegRef = reg;
    return reg;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function getPushToken(): Promise<string | null> {
  const messaging = await ensureMessaging();
  if (!messaging) return null;
  const cfg = readConfig();
  const vapid = readVapidKey();
  if (!cfg || !vapid) return null;
  const reg = await ensureServiceWorker(cfg);
  if (!reg) return null;
  try {
    const token = await getToken(messaging, {
      vapidKey: vapid,
      serviceWorkerRegistration: reg,
    });
    return token || null;
  } catch {
    return null;
  }
}

export async function registerPushTokenWithServer(
  token: string,
): Promise<boolean> {
  try {
    const res = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function enablePush(): Promise<{
  ok: boolean;
  reason?: 'unsupported' | 'denied' | 'no-token' | 'server-reject';
  token?: string;
}> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  const cfg = readConfig();
  if (!cfg || !readVapidKey()) return { ok: false, reason: 'unsupported' };
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  const token = await getPushToken();
  if (!token) return { ok: false, reason: 'no-token' };
  const ok = await registerPushTokenWithServer(token);
  if (!ok) return { ok: false, reason: 'server-reject', token };
  return { ok: true, token };
}

export async function onForegroundMessage(
  handler: (payload: unknown) => void,
): Promise<() => void> {
  const messaging = await ensureMessaging();
  if (!messaging) return () => {};
  const unsub = onMessage(messaging, handler);
  return unsub;
}
