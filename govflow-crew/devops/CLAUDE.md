# GovFlow Crew — DevOps (인프라팀)
# 이 파일을 읽으면 API Routes + 배포 + 앱을 혼자 완성할 수 있다.

## 역할
API Routes · 이미지 업로드(R2) · Vercel 배포 · Railway DB · React Native 앱 전담.

---

## 전담 파일 목록

```
app/api/
├── policies/route.ts              GET 목록 + POST 생성
├── policies/[id]/route.ts         GET · PATCH · DELETE
├── upload/route.ts                Cloudflare R2 이미지 업로드
├── threads/
│   ├── publish/route.ts           Threads API 발행
│   ├── generate/route.ts          GPT 포스트 생성
│   └── insights/route.ts          성과 데이터 조회
├── crawler/trigger/route.ts       수동 크롤러 트리거
├── fcm/register/route.ts          FCM 토큰 등록
└── analytics/route.ts             트래픽 집계

mobile/App.tsx                     React Native 웹뷰 앱
next.config.ts                     301 리다이렉트 + 이미지 도메인
vercel.json                        Vercel 빌드 설정
public/ads.txt                     AdSense 필수 파일
```

## 절대 건드리지 않는 파일
```
app/(admin)/   (Builder 전담)
app/(public)/  (Builder 전담)
lib/           (Growth 전담)
prisma/        (Chief 전담)
crawler/       (Harvester 전담)
```

---

## API 공통 원칙

```typescript
// 모든 Route Handler는 NextResponse.json() 반환
// 인증 필요 어드민 API: getServerSession() 체크 후 401 반환
// 에러 처리: try/catch + 적절한 HTTP 상태코드

// 공통 응답 형식:
{ data: T }               // 성공
{ error: string }         // 실패

// 페이지네이션:
{ policies: T[], total: number }
// 쿼리: ?take=20&skip=0&status=PUBLISHED&geoRegion=서울
```

---

## app/api/policies/route.ts 구현 명세

```typescript
// GET /api/policies
// Query: status(PolicyStatus) · geoRegion · take(default 20) · skip(default 0)
// 반환: { policies: Policy[] (category·faqs 포함), total: number }
// 정렬: publishedAt desc

// POST /api/policies
// Body: { slug, title, content, excerpt, focusKeyword, metaDesc,
//         status, geoRegion, featuredImg, applyUrl,
//         faqs: [{q, a}][] }
// 처리:
//   - status === 'PUBLISHED' 이면 publishedAt = new Date()
//   - faqs 있으면 Faq 레코드 같이 create
// 반환: 생성된 Policy (status 201)
```

---

## app/api/policies/[id]/route.ts 구현 명세

```typescript
// GET /api/policies/[id]
// 반환: Policy (faqs · category 포함)
// 없으면 404

// PATCH /api/policies/[id]
// Body: 수정할 필드만 (partial)
// status가 PUBLISHED로 변경되면 publishedAt = new Date()
// faqs: 기존 전체 삭제 후 재생성

// DELETE /api/policies/[id]
// 소프트 삭제 아님 - 실제 삭제
// 관련 Faq, ThreadsPost도 cascade 삭제 (prisma 설정)
```

---

## app/api/upload/route.ts 구현 명세

```typescript
// POST /api/upload
// FormData에서 file 추출
// key: uploads/${year}/${nanoid()}.${ext}
// S3Client (R2 endpoint: https://{CF_ACCOUNT_ID}.r2.cloudflarestorage.com)
// PutObjectCommand: Bucket·Key·Body·ContentType·CacheControl:'public, max-age=31536000'
// 반환: { url: `${R2_PUBLIC_URL}/${key}` }
// 파일 없으면 400

// 환경변수:
// CF_ACCOUNT_ID · R2_ACCESS_KEY · R2_SECRET_KEY · R2_BUCKET · R2_PUBLIC_URL
```

---

## app/api/threads/publish/route.ts 구현 명세

```typescript
// POST /api/threads/publish
// Body: { policyId: number, format: Format, content?: string }
// 처리:
//   1. policy 조회 (없으면 404)
//   2. content 없으면 lib/threads-generator의 generateThreadsPost 호출
//   3. lib/threads-publisher의 ThreadsPublisher().publish(content) 호출
//   4. 실패 시 500
//   5. DB에 ThreadsPost create { policyId, content, format, threadsId, status:'PUBLISHED', publishedAt:now }
// 반환: 생성된 ThreadsPost (201)
```

---

## app/api/threads/generate/route.ts 구현 명세

```typescript
// POST /api/threads/generate
// Body: { policyId: number, format: Format }
// policy 조회 후 generateThreadsPost 호출
// 반환: { content: string }
// DB 저장 없음 (미리보기/수정용)
```

---

## app/api/threads/insights/route.ts 구현 명세

```typescript
// GET /api/threads/insights
// Query: ?days=7 (최근 N일, default 7)
// DB에서 publishedAt >= N일 전인 ThreadsPost 조회
// 반환: 포맷별 집계 + 개별 포스트 목록
// lib/rl-engine의 calcFormatStats 사용
```

---

## app/api/fcm/register/route.ts 구현 명세

```typescript
// POST /api/fcm/register
// Body: { token: string, platform: 'android' | 'ios' }
// sanitize 후 DB upsert (token unique 충돌 시 update)
// 반환: { ok: true }
// 인증 불필요 (앱에서 로그인 없이 호출)
```

---

## next.config.ts 전체 코드

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/category/:slug', destination: '/welfare/category/:slug', permanent: true },
      { source: '/tag/:slug',      destination: '/welfare/tag/:slug',      permanent: true },
      { source: '/archives/:slug', destination: '/welfare/:slug',          permanent: true },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'p', value: '(?<id>.*)' }],
        destination: '/wp-redirect/:id',
      },
      {
        source: '/',
        has: [{ type: 'query', key: 'page_id', value: '(?<id>.*)' }],
        destination: '/wp-redirect/:id',
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.yourdomain.com' },
      { protocol: 'https', hostname: 'play-lh.googleusercontent.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

export default nextConfig
```

---

## mobile/App.tsx 구현 명세

```typescript
// BASE_URL = 'https://yourdomain.com'
// ALLOWED_DOMAINS = ['yourdomain.com', 'kauth.kakao.com', 'kakao.com']

// useEffect:
//   1. messaging().requestPermission()
//   2. getToken() → AsyncStorage 저장 → /api/fcm/register POST
//   3. messaging().onMessage → url 있으면 webviewRef.injectJavaScript navigate
//   4. messaging().onNotificationOpenedApp → 동일 처리
//   5. BackHandler 뒤로가기 등록

// INJECTED_JS (injectedJavaScriptBeforeContentLoaded):
//   window.IS_APP = true
//   document.cookie = 'app_mode=1; path=/; max-age=31536000'
//   AdSense 숨김: .adsbygoogle { display:none !important }
//   외부 링크 target="_blank" → 현재 창에서 열기

// onShouldStartLoadWithRequest:
//   kakaokompassauth:// · intent:// · tel: · mailto: → return false (외부앱)
//   나머지 → return true

// SafeAreaView + StatusBar + WebView + ActivityIndicator(로딩중)
```

---

## Vercel 배포 명령어 (순서대로)

```bash
# 1. Vercel CLI 설치 (이미 있으면 생략)
npm install -g vercel

# 2. 프로젝트 연결
vercel link

# 3. 환경변수 전체 설정
vercel env add DATABASE_URL         production
vercel env add OPENAI_API_KEY       production
vercel env add CF_ACCOUNT_ID        production
vercel env add R2_ACCESS_KEY        production
vercel env add R2_SECRET_KEY        production
vercel env add R2_BUCKET            production
vercel env add R2_PUBLIC_URL        production
vercel env add THREADS_USER_ID      production
vercel env add THREADS_ACCESS_TOKEN production
vercel env add NEXTAUTH_SECRET      production
vercel env add NEXTAUTH_URL         production
vercel env add KAKAO_CLIENT_ID      production
vercel env add KAKAO_CLIENT_SECRET  production
vercel env add ADSENSE_PUB_ID       production
vercel env add FCM_SERVER_KEY       production

# 4. 프로덕션 배포
vercel --prod

# 5. 도메인 연결 (Cloudflare DNS에서 A레코드 설정)
vercel domains add yourdomain.com
```

---

## Railway DB 설정

```bash
# 1. railway.app 에서 프로젝트 생성
# 2. PostgreSQL 플러그인 추가
# 3. Connect 탭에서 DATABASE_URL 복사
# 4. 위 Vercel env add DATABASE_URL 에 붙여넣기

# 5. 마이그레이션 실행
DATABASE_URL="복사한URL" npx prisma migrate deploy

# 6. (선택) 크롤러를 Railway 서비스로 추가
# Dockerfile 또는 nixpacks 사용
# 환경변수: OPENAI_API_KEY · WP_URL · WP_USER · WP_APP_PASSWORD
```

---

## public/ads.txt 내용

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
※ XXXXXXXXXXXXXXXX 는 AdSense 승인 후 실제 pub 코드로 교체

---

## 완료 기준 체크리스트

- [ ] app/api/policies/route.ts — GET·POST 작동
- [ ] app/api/policies/[id]/route.ts — GET·PATCH·DELETE 작동
- [ ] app/api/upload/route.ts — R2 업로드 + URL 반환
- [ ] app/api/threads/publish/route.ts — 발행 + DB 저장
- [ ] app/api/threads/generate/route.ts — GPT 생성만 반환
- [ ] app/api/threads/insights/route.ts — 성과 집계 반환
- [ ] app/api/fcm/register/route.ts — 토큰 upsert
- [ ] next.config.ts — 301 리다이렉트 + rewrites
- [ ] mobile/App.tsx — FCM + AdSense 숨김 + 뒤로가기
- [ ] Vercel 배포 — https://yourdomain.com 접근 확인
- [ ] Railway DB — 테이블 생성 확인
- [ ] public/ads.txt — yourdomain.com/ads.txt 접근 확인

---

## Chief에게 완료 보고 형식

```
[DevOps] 완료 보고
- 완성된 파일: app/api/ 전체 · next.config.ts · mobile/App.tsx · vercel.json
- Vercel 배포: https://[배포URL]
- Railway DB: 테이블 [개수]개 생성 확인
- Builder에게 전달: API 엔드포인트 목록 + 요청/응답 형식
- 블로킹 이슈: 없음
```
