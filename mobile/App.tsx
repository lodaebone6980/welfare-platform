import React, { useRef, useEffect, useState } from 'react'
import {
  BackHandler, Platform, StatusBar,
  SafeAreaView, StyleSheet, ActivityIndicator, View,
} from 'react-native'
import WebView, { WebViewNavigation } from 'react-native-webview'
import messaging from '@react-native-firebase/messaging'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'https://yourdomain.com'

// 웹뷰 내부에서 처리할 도메인
const ALLOWED_DOMAINS = [
  'yourdomain.com',
  'kauth.kakao.com',
  'kakao.com',
]

function isDomainAllowed(url: string) {
  return ALLOWED_DOMAINS.some(d => url.includes(d))
}

export default function App() {
  const webviewRef = useRef<WebView>(null)
  const [loading,    setLoading]    = useState(true)
  const [canGoBack,  setCanGoBack]  = useState(false)

  useEffect(() => {
    setupFCM()
    BackHandler.addEventListener('hardwareBackPress', handleBack)
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBack)
  }, [canGoBack])

  const handleBack = () => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack()
      return true
    }
    return false
  }

  const setupFCM = async () => {
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (!enabled) return

    const token = await messaging().getToken()
    await AsyncStorage.setItem('fcm_token', token)

    // 서버에 FCM 토큰 등록
    fetch(`${BASE_URL}/api/fcm/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, platform: Platform.OS }),
    }).catch(() => {})

    // 포어그라운드 알림 수신 → 해당 URL로 이동
    messaging().onMessage(async msg => {
      const url = msg.data?.url as string | undefined
      if (url && webviewRef.current) {
        webviewRef.current.injectJavaScript(`window.location.href='${url}';true;`)
      }
    })

    // 백그라운드에서 탭 → 앱 열기
    messaging().onNotificationOpenedApp(msg => {
      const url = msg.data?.url as string | undefined
      if (url && webviewRef.current) {
        webviewRef.current.injectJavaScript(`window.location.href='${url}';true;`)
      }
    })
  }

  // 앱 환경 알림 + AdSense 숨김 + 외부 링크 처리
  const INJECTED_JS = `
    (function() {
      window.IS_APP = true;
      window.APP_PLATFORM = '${Platform.OS}';
      document.cookie = 'app_mode=1; path=/; max-age=31536000';

      // AdSense 숨김 (앱은 AdMob 사용)
      var style = document.createElement('style');
      style.textContent = '.adsbygoogle, .ad-slot { display:none !important; }';
      document.head.appendChild(style);

      // 외부 링크 현재 창에서 열기
      document.addEventListener('click', function(e) {
        var a = e.target.closest('a[target="_blank"]');
        if (a) { e.preventDefault(); window.location.href = a.href; }
      });
    })();
    true;
  `

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      <WebView
        ref={webviewRef}
        source={{ uri: BASE_URL }}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        onNavigationStateChange={(state: WebViewNavigation) => {
          setCanGoBack(state.canGoBack)
        }}
        onShouldStartLoadWithRequest={req => {
          // 카카오 딥링크 등 외부 앱 처리
          if (req.url.startsWith('kakaokompassauth://') ||
              req.url.startsWith('intent://') ||
              req.url.startsWith('tel:') ||
              req.url.startsWith('mailto:')) {
            return false
          }
          return true
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={()  => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        cacheEnabled
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview:   { flex: 1 },
  loader: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    bottom:          0,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
})
