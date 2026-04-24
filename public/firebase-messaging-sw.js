/* global self, importScripts, firebase */
/**
 * public/firebase-messaging-sw.js
 * ---------------------------------------------------------------
 * Firebase Cloud Messaging(FCM) 웹 서비스워커.
 * - 브라우저가 백그라운드 상태일 때 FCM 서버가 보낸 푸시를 수신
 * - 알림 클릭 시 지정된 url 로 포커스 이동
 *
 * 이 파일은 반드시 사이트 루트(/firebase-messaging-sw.js)에서
 * 서빙되어야 한다. Next.js 의 public/ 이 해당 위치에 매핑된다.
 *
 * 환경변수 대신 __PUSH_CONFIG__ 를 클라이언트가 런타임에 주입할 수도 있지만
 * 서비스워커는 독립 컨텍스트라 여기선 NEXT_PUBLIC_* 값을 빌드 타임에 치환하는
 * 방식을 쓰지 않고, 클라이언트에서 fetch('/api/push/config') 등으로 넘겨주는 패턴도 가능.
 * 지금은 빈 값으로 두고 messaging.onBackgroundMessage 만 안정적으로 등록한다.
 * ---------------------------------------------------------------
 */

importScripts(
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js',
);

// 클라이언트 page 가 postMessage 로 config 를 넘겨주면 그때 초기화.
let initialized = false;

self.addEventListener('message', (event) => {
  if (initialized) return;
  const data = event.data || {};
  if (data.type !== 'FCM_CONFIG' || !data.config) return;
  try {
    firebase.initializeApp(data.config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || '지원금길잡이';
      const body = payload.notification?.body || '새 소식이 있습니다.';
      const url = payload.fcmOptions?.link || payload.data?.url || '/';
      self.registration.showNotification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: { url },
      });
    });
    initialized = true;
  } catch (e) {
    // 설정 실패는 조용히 무시 (자격증명 미설정 환경)
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((all) => {
        for (const client of all) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      }),
  );
});
