'use client';

/**
 * components/push/PushRegistrar.tsx
 * ---------------------------------------------------------------
 * 로그인 상태가 확인되면 다음을 수행:
 *  1) 세션에 동의 플래그(localStorage: pushOptIn=1) 가 있는 경우에만 자동 등록
 *  2) 권한이 granted 여야만 실제 등록
 *
 * UI 렌더링이 없는 순수 effect 컴포넌트(null 반환).
 * 상단 레이아웃에서 한 번만 마운트하면 됨.
 * ---------------------------------------------------------------
 */

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function PushRegistrar() {
  const { status } = useSession();
  const doneRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (doneRef.current) return;
    if (typeof window === 'undefined') return;

    let optIn = false;
    try {
      optIn = window.localStorage.getItem('pushOptIn') === '1';
    } catch {
      optIn = false;
    }
    if (!optIn) return;

    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    doneRef.current = true;

    (async () => {
      try {
        const mod = await import('@/lib/push/client');
        const r = await mod.enablePush();
        if (!r.ok && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[push] enablePush failed:', r.reason);
        }
      } catch {
        /* silent */
      }
    })();
  }, [status]);

  return null;
}
