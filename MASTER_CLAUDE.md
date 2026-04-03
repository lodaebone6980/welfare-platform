# GovFlow Crew — 완전 마스터 가이드
# Claude Code가 이 파일 하나만 읽으면 전체 프로젝트를 이해할 수 있다.
# 생략 없이 모든 내용 포함.

---

## 1. 프로젝트 정체성

### 무엇을 만드는가
대한민국 정부 지원금·정책·뉴스를 자동 수집·큐레이션하는 콘텐츠 플랫폼.
참고 사이트: bokjiking.co.kr, gp2.newsdaa.com, gg24.kr, govhelp.co.kr

### 수익 구조
1. Google AdSense — pub 코드 1개로 루트 도메인 + 전체 서브도메인 커버
2. CPA 제휴 — 보험·대출·증권 계좌개설 (건당 3~10만원)
3. AdMob — 앱 내 광고 (AdSense와 분리 운영)

### 핵심 전략
- WP에서 먼저 AdSense 승인받고 → Next.js로 이전 (같은 도메인 유지 시 재심사 없음)
- 루트 도메인으로 승인 → 서브도메인 전체 추가 심사 없이 커버
- Threads RL(강화학습) 시스템으로 포맷별 REWARD/PUNISHMENT 자동 최적화
- GEO 타겟팅 — 17개 시도별 랜딩 페이지로 지역 검색 커버

---

## 2. 기술 스택

| 레이어 | 기술 | 버전 | 용도 |
|---|---|---|---|
| Frontend | Next.js App Router | 14.2.5 | 공개 사이트 + 어드민 |
| Styling | Tailwind CSS | latest | 스타일링 |
| Database | PostgreSQL | latest | 정책·뉴스·유저 데이터 |
| ORM | Prisma | 5.16.0 | DB 클라이언트 |
| 배포-프론트 | Vercel | - | Next.js 자동 배포 |
| 배포-백엔드 | Railway | - | PostgreSQL + 크롤러 Cron |
| 에디터 | TipTap | 2.4.0 | 리치 텍스트 + 이미지 |
| 인증 | NextAuth.js | 4.24.7 | 어드민 + 카카오 로그인 |
| 이미지 | Cloudflare R2 | - | 썸네일 저장 |
| AI-리라이팅 | GPT-4o-mini | - | 비용 최적화 |
| AI-썸네일 | DALL-E 3 | - | 자동 이미지 생성 |
| 크롤러 | Python 3.11 | - | feedparser + newspaper3k |
| 앱 | React Native | - | 웹뷰 Android + iOS |
| 자동화 | GitHub Actions | - | 크롤러·Threads·광고 |
| DNS/CDN | Cloudflare | 무료 | SSL + DDoS 방어 |

---

## 3. 전체 디렉토리 구조

```
welfare-platform/
│
├── MASTER_CLAUDE.md              ← 이 파일 (전체 컨텍스트)
├── package.json
├── next.config.ts
├── vercel.json
├── tsconfig.json
├── tailwind.config.ts
├── public/
│   └── ads.txt                   ← AdSense 필수
│
├── prisma/
│   └── schema.prisma             ← DB 스키마 전체
│
├── app/
│   ├── layout.tsx                ← 루트 레이아웃
│   ├── sitemap.ts                ← 사이트맵 자동 생성
│   │
│   ├── (public)/                 ← 공개 사이트
│   │   ├── page.tsx              ← 메인 홈
│   │   ├── welfare/
│   │   │   ├── [slug]/page.tsx   ← 정책 상세 (FAQPage 스키마)
│   │   │   └── [region]/page.tsx ← GEO 랜딩 (서울·경기 등 17개)
│   │   └── news/[slug]/page.tsx  ← 뉴스형 포스트
│   │
│   ├── (admin)/                  ← 어드민 (NextAuth 인증 필요)
│   │   ├── layout.tsx            ← 사이드바 + 탑바
│   │   ├── dashboard/page.tsx    ← 오늘의 미션 + 스트릭 + 메트릭
│   │   ├── content/
│   │   │   ├── policy/page.tsx   ← 정책 목록 + 검색 + 필터
│   │   │   ├── policy/[id]/page.tsx ← TipTap 에디터 + SEO 패널
│   │   │   ├── bulk/page.tsx     ← GEO 대량 생성
│   │   │   └── category/page.tsx ← 카테고리 관리
│   │   ├── api-status/page.tsx   ← API 소스별 수집 현황
│   │   ├── traffic/page.tsx      ← GEO 지역별 유입 분석
│   │   ├── trending/page.tsx     ← 검색 트렌딩 + CPC 단가
│   │   └── marketing/
│   │       ├── threads/page.tsx           ← 발행목록 + 생성탭
│   │       ├── threads-analytics/page.tsx ← RL 포맷별 성과차트
│   │       ├── google-ads/page.tsx        ← 에이전트 + 건강점수
│   │       ├── meta/page.tsx
│   │       ├── naver/page.tsx
│   │       ├── instagram/page.tsx
│   │       ├── tiktok/page.tsx
│   │       └── naver-blog/page.tsx        ← 포스트인컴 방식
│   │
│   ├── api/
│   │   ├── policies/route.ts              ← GET 목록 + POST 생성
│   │   ├── policies/[id]/route.ts         ← GET·PATCH·DELETE
│   │   ├── upload/route.ts                ← Cloudflare R2 업로드
│   │   ├── threads/
│   │   │   ├── publish/route.ts           ← Threads API 발행
│   │   │   ├── generate/route.ts          ← GPT 포스트 생성
│   │   │   └── insights/route.ts          ← 성과 데이터 조회
│   │   ├── crawler/trigger/route.ts       ← 수동 크롤러 트리거
│   │   ├── fcm/register/route.ts          ← FCM 토큰 등록
│   │   └── analytics/route.ts             ← 트래픽 집계
│   │
│   ├── wp-redirect/[id]/page.tsx          ← WP ?p=ID → 새 슬러그
│   └── login/page.tsx                     ← NextAuth 로그인
│
├── components/
│   ├── editor/
│   │   ├── RichEditor.tsx         ← TipTap (툴바·버블메뉴·CTA·FAQ)
│   │   ├── ImageUpload.tsx        ← R2 업로드 버튼
│   │   └── SeoPanel.tsx           ← GEO + 메타 + 발행설정 패널
│   └── layout/
│       ├── Sidebar.tsx            ← 어드민 사이드바 내비게이션
│       └── Topbar.tsx             ← 상단 타이틀 + 버튼
│
├── lib/
│   ├── prisma.ts                  ← DB 클라이언트 싱글턴
│   ├── rl-engine.ts               ← REWARD/PUNISHMENT 판정 + 추천
│   ├── threads-generator.ts       ← 포맷별 GPT 프롬프트 6종
│   ├── threads-publisher.ts       ← Threads API 발행·성과조회
│   └── seo.ts                     ← GEO 메타태그 + JSON-LD 생성
│
├── scripts/
│   ├── threads-post.ts            ← 일일 Threads 자동 발행
│   ├── update-verdicts.ts         ← 성과 수집 + REWARD 판정
│   └── ads-agent.ts               ← 구글광고 키워드 자동 최적화
│
├── crawler/                       ← Python 크롤러
│   ├── config.py
│   ├── db.py
│   ├── keyword_filter.py
│   ├── fetcher.py
│   ├── rewriter.py
│   ├── image_gen.py
│   ├── publisher.py
│   ├── main.py
│   └── requirements.txt
│
├── mobile/
│   └── App.tsx                    ← React Native 웹뷰 앱
│
├── config/
│   └── niche.ts                   ← 니치별 설정 (확장용)
│
└── .github/
    └── workflows/
        └── daily-automation.yml   ← 전체 자동화 스케줄
```

---

## 4. DB 스키마 (prisma/schema.prisma 전체)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Policy {
  id           Int          @id @default(autoincrement())
  slug         String       @unique
  title        String
  content      String       @db.Text
  excerpt      String?
  focusKeyword String?
  metaDesc     String?
  status       PolicyStatus @default(DRAFT)
  categoryId   Int?
  category     Category?    @relation(fields: [categoryId], references: [id])
  geoRegion    String?
  geoDistrict  String?
  featuredImg  String?
  applyUrl     String?
  viewCount    Int          @default(0)
  wpId         Int?         @unique
  priority     Float?
  publishedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  faqs         Faq[]
  threadsPosts ThreadsPost[]
  @@index([status, publishedAt])
  @@index([geoRegion])
}

model ThreadsPost {
  id          Int      @id @default(autoincrement())
  policyId    Int?
  policy      Policy?  @relation(fields: [policyId], references: [id])
  content     String   @db.Text
  format      String   // checklist·qa·story·number·compilation·cardnews
  threadsId   String?
  views       Int      @default(0)
  likes       Int      @default(0)
  comments    Int      @default(0)
  shares      Int      @default(0)
  verdict     String?  // REWARD·PUNISHMENT·NEUTRAL
  scheduledAt DateTime?
  publishedAt DateTime?
  status      String   @default("DRAFT")
  createdAt   DateTime @default(now())
  @@index([format])
  @@index([verdict])
}

model Category {
  id       Int      @id @default(autoincrement())
  name     String
  slug     String   @unique
  policies Policy[]
}

model Faq {
  id       Int    @id @default(autoincrement())
  question String
  answer   String @db.Text
  policyId Int
  policy   Policy @relation(fields: [policyId], references: [id])
  order    Int    @default(0)
}

model ApiSource {
  id          Int      @id @default(autoincrement())
  name        String
  url         String
  type        String   // RSS·REST·SCRAPE
  status      String   @default("ACTIVE")
  lastSuccess DateTime?
  lastError   String?
  todayCount  Int      @default(0)
  totalCount  Int      @default(0)
  createdAt   DateTime @default(now())
}

model UrlMapping {
  id        Int      @id @default(autoincrement())
  wpId      Int      @unique
  oldSlug   String
  newSlug   String
  createdAt DateTime @default(now())
}

model SocialPost {
  id          Int      @id @default(autoincrement())
  platform    String   // THREADS·INSTAGRAM·TIKTOK·NAVER_BLOG
  content     String   @db.Text
  imageUrl    String?
  scheduledAt DateTime?
  publishedAt DateTime?
  status      String   @default("SCHEDULED")
  reach       Int?
  likes       Int?
  comments    Int?
  policyId    Int?
  createdAt   DateTime @default(now())
}

model FcmToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  platform  String   @default("android")
  userId    Int?
  createdAt DateTime @default(now())
}

enum PolicyStatus { DRAFT REVIEW PUBLISHED ARCHIVED }
```

---

## 5. 환경변수 전체 목록 (.env.local)

```env
# ── DB ──────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/dbname

# ── AI ──────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Cloudflare R2 이미지 ─────────────────────────
CF_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=welfare-images
R2_PUBLIC_URL=https://images.yourdomain.com

# ── Threads SNS ──────────────────────────────────
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=

# ── 구글 광고 에이전트 ────────────────────────────
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEV_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_REFRESH_TOKEN=

# ── NextAuth 인증 ─────────────────────────────────
NEXTAUTH_SECRET=랜덤32자이상문자열
NEXTAUTH_URL=https://yourdomain.com
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# ── 공공데이터포털 (data.go.kr) ───────────────────
DATA_GO_KR_KEY=

# ── FCM 푸시 ──────────────────────────────────────
FCM_SERVER_KEY=

# ── AdSense (승인 후 입력) ────────────────────────
ADSENSE_PUB_ID=ca-pub-XXXXXXXXXXXXXXXX

# ── WordPress (크롤러용) ──────────────────────────
WP_URL=https://yourdomain.com
WP_USER=admin
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## 6. 공공 API 소스 목록

```python
# crawler/config.py 에 들어갈 내용
RSS_SOURCES = [
    ("보건복지부",   "https://www.mohw.go.kr/react/rss/rss.jsp"),
    ("고용노동부",   "https://www.moel.go.kr/rss/news.rss"),
    ("정책브리핑",   "https://www.korea.kr/rss/news.xml"),
    ("연합뉴스경제", "https://www.yna.co.kr/rss/economy.xml"),
    ("뉴시스사회",   "https://www.newsis.com/RSS/society.xml"),
    ("네이버사회",   "https://news.naver.com/rss/section/102.xml"),
]

MUST_KEYWORDS  = ["지원금","환급금","보조금","바우처","장려금","급여","혜택","신청"]
BOOST_KEYWORDS = ["2026","최대","만원","대상","조건","방법","신청기간","모집","채용"]

# 공공데이터포털 (data.go.kr) 에서 API 키 발급 필요:
# - 복지로 서비스 목록 API
# - 고용24 채용공고 API
# - 국세청 환급금 조회 API
```

---

## 7. Threads RL 시스템

### 포맷 6종
```
checklist   · qa   · story   · number   · compilation   · cardnews
```

### 판정 기준 (govhelp.co.kr 역분석)
```typescript
REWARD:      댓글 2개 이상  OR  참여율 1% 이상
PUNISHMENT:  조회 30 미만   AND 댓글 0
NEUTRAL:     그 외
```

### 실제 성과 데이터
```typescript
const DEFAULT_STATS = [
  // format        count  avgViews  avgEngagement  rewardRate
  { format: 'checklist',   count: 7,  avgViews: 233, avgEngagement: 1.5,  rewardRate: 71  },
  { format: 'qa',          count: 1,  avgViews: 167, avgEngagement: 1.2,  rewardRate: 100 },
  { format: 'number',      count: 3,  avgViews: 112, avgEngagement: 10.4, rewardRate: 67  },
  { format: 'story',       count: 6,  avgViews: 69,  avgEngagement: 5.9,  rewardRate: 83  },
  { format: 'cardnews',    count: 1,  avgViews: 61,  avgEngagement: 3.3,  rewardRate: 100 },
  { format: 'compilation', count: 8,  avgViews: 20,  avgEngagement: 0.0,  rewardRate: 0   },
  // compilation은 PUNISHMENT 多 → 비중 줄일 것
]
```

### Persona DNA (govhelp.co.kr 스타일)
```
avg_chars: 400
line_break: 문장마다 줄바꿈
톤: 캐주얼·정보성·약간 장난기
시그니처: "~하는게 핵심이야", "~하면 낫지 않나?", "~하는게 낫지 않을까?"
top_emoji: ✅ 🔥 💸 😅 (자연스럽게 1~3개)
cta_style: 신청 링크 직접 유도
```

### 포맷별 프롬프트 구조
```
checklist:   ✅ [조건] 형식 + 훅 + 450자 이내
qa:          Q: 🤔 / A: 형식 + 핵심 답변 2~3줄
story:       공감 훅 → 상황 → 지원금 → 마감 압박
number:      큰 숫자로 시작 → 혜택 목록 → CTA
compilation: "신청 안 하면 후회" 훅 → 3~5개 묶음
cardnews:    강렬 한 줄 → 핵심 불릿 → 링크
```

---

## 8. SEO GEO 전략

### GEO 메타태그 (17개 시도)
```typescript
const REGION_CODES: Record<string, string> = {
  서울: '11', 경기: '41', 부산: '26', 인천: '28',
  대구: '27', 대전: '30', 광주: '29', 울산: '31',
  세종: '36', 강원: '42', 충북: '43', 충남: '44',
  전북: '45', 전남: '46', 경북: '47', 경남: '48', 제주: '50',
}
// 적용: <meta name="geo.region" content="KR-11"> 형식
```

### JSON-LD 스키마 자동 생성
```
1. Article 스키마 — 모든 정책 상세 페이지
2. FAQPage 스키마 — FAQ 있는 페이지 (구글 리치 결과)
3. BreadcrumbList — 카테고리 계층
```

### URL 구조 (SEO 최적화)
```
/welfare/[slug]          정책 상세  → ISR 1시간 재생성
/welfare/seoul           서울 GEO 랜딩
/welfare/gyeonggi        경기 GEO 랜딩
... (17개 시도)
/news/[slug]             뉴스형 포스트
/sitemap.xml             자동 생성
/ads.txt                 AdSense 필수
```

### WP → Next.js URL 이전 (301 리다이렉트)
```typescript
// next.config.ts
redirects: [
  { source: '/category/:slug', destination: '/welfare/category/:slug', permanent: true },
  { source: '/tag/:slug',      destination: '/welfare/tag/:slug',      permanent: true },
  { source: '/archives/:slug', destination: '/welfare/:slug',          permanent: true },
]
rewrites: [
  // WP ?p=ID → wp-redirect 핸들러
  { source: '/', has: [{ type: 'query', key: 'p' }], destination: '/wp-redirect/:id' },
]
```

---

## 9. AdSense 전략

```
승인 전략:
1. WP에서 루트 도메인으로 먼저 승인
2. 콘텐츠 50개 이상 + 3주 운영 후 심사 신청
3. 승인 후 Next.js 이전 (같은 도메인 유지 시 재심사 없음)
4. 다른 도메인 이전 시 AdSense 계정에 사이트 추가 (1~2일 소요)

배치 전략:
- Auto Ads 활성화 (enable_page_level_ads: true)
- 수동 슬롯 3개: 상단(1111111111) · 인아티클(2222222222) · 하단(3333333333)
- 앱에서는 AdSense 쿠키(app_mode=1) 감지 후 숨김 → AdMob 별도 운영

ads.txt (public/ads.txt):
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

---

## 10. 배포 인프라

```
사용자
  ↓ HTTPS
Cloudflare (DNS + CDN + SSL + DDoS 방어 — 무료)
  ↓
Vercel (Next.js 웹사이트 + API Routes)
  ↓ DATABASE_URL 환경변수로 연결
Railway (PostgreSQL DB + 크롤러 Cron 서비스)

GitHub Actions (별도 자동화):
  - content-pipeline:  매일 오전 11시 KST (크롤러)
  - threads-morning:   매일 오전 9시 KST  (Threads 발행)
  - threads-evening:   매일 오후 7시 KST  (Threads 발행)
  - ads-agent:         매일 오전 2시 KST  (광고 최적화)
  - verdict-update:    매일 자정 KST      (성과 수집)
```

### 월 비용
```
Cloudflare:    무료
Vercel Pro:    $20/월 (약 2.7만원)
Railway:       $10/월 (약 1.3만원)
합계:          약 4~5만원/월
```

---

## 11. GovFlow Crew — 서브에이전트 팀 구성

### 팀 이름: GovFlow Crew
```
5명 구성:
Chief     — 총괄 아키텍트 (조율·스키마·리뷰)
Harvester — 크롤러팀 (수집·리라이팅·포스팅)
Builder   — 프론트팀 (UI·어드민·공개사이트)
Growth    — 그로스팀 (SEO·SNS·RL엔진·광고)
DevOps    — 인프라팀 (API·배포·앱)
```

### 파일 소유권 (충돌 방지 핵심 규칙)
```
Chief     → prisma/schema.prisma · MASTER_CLAUDE.md · package.json
Harvester → crawler/ (전체)
Builder   → app/(admin)/ · app/(public)/ · components/
Growth    → lib/ · scripts/
DevOps    → app/api/ · mobile/ · next.config.ts · vercel.json
```

### Chief 역할 상세
```
1. 매 세션: MASTER_CLAUDE.md 읽기 → git status 확인 → 작업 배분
2. prisma/schema.prisma 단독 관리 (다른 에이전트 수정 금지)
3. 에이전트 간 충돌 감지 및 조정
4. git commit 컨벤션: "[팀명] 작업내용"
5. 병렬 가능한 조합 관리:
   - Harvester + Builder 동시 가능 (crawler/ vs app/ 겹치지 않음)
   - Builder + Growth 동시 가능 (app/(admin)/ vs lib/ 겹치지 않음)
   - Growth + DevOps 동시 가능 (lib/ vs app/api/ 겹치지 않음)
   - 순서 필요: prisma migrate → 전체 / DevOps API → Builder UI 연결
```

### Harvester 역할 상세
```
담당: crawler/ 전체
주요 작업:
- fetcher.py: RSS 6개 소스 수집 + 키워드 스코어링 (must 2점 미만 제외)
- rewriter.py: GPT-4o-mini 리라이팅 → JSON 반환
  (title·content·excerpt·tags·category·apply_url·focus_keyword·faqs)
- image_gen.py: DALL-E 3 썸네일 생성 (1792x1024, 저장 후 경로 반환)
- publisher.py: WP REST API Basic Auth 포스팅 + 이미지 업로드
- db.py: SQLite crawler.db 중복 방지
- main.py: 일 5개 제한 + schedule 라이브러리로 오전 11시 자동 실행
필요 환경변수: OPENAI_API_KEY · WP_URL · WP_USER · WP_APP_PASSWORD · DATA_GO_KR_KEY
```

### Builder 역할 상세
```
담당: app/(admin)/ · app/(public)/ · components/
주요 작업:
- Sidebar.tsx: 전체 메뉴 active 상태 + Next.js Link
- 대시보드: 오늘의 미션(프로그레스바) + 발행 스트릭 + 메트릭 카드 4개 + RL 요약
- TipTap 에디터: B·I·H2·H3·링크·이미지업로드·표·목록·CTA버튼·FAQ블록·버블메뉴
- SeoPanel: GEO 태그 멀티셀렉트 + 메타 + canonical + 발행 토글 3개
- Threads 관리: 발행됨·대기중·생성하기 탭 + 포맷 배지 + REWARD/PUNISHMENT 배지
- 정책 상세: JSON-LD Article + FAQPage 스키마 + AdSense 슬롯 3개 + ISR 1시간
- GEO 랜딩: 17개 시도 × 필터링된 정책 카드 + geo.region 메타태그
API 연동: app/api/ 에서 fetch (DevOps 완료 전에는 mock 데이터로 UI 먼저 완성)
```

### Growth 역할 상세
```
담당: lib/ · scripts/
주요 작업:
- lib/rl-engine.ts:
    calcVerdict(views·likes·comments·shares) → REWARD|PUNISHMENT|NEUTRAL
    calcFormatStats(posts[]) → 포맷별 평균 성과 집계
    recommendNextFormat(stats) → 상위 2개 랜덤 교대 추천
    DEFAULT_STATS → 초기 데이터 없을 때 govhelp 역분석 수치 사용
- lib/threads-generator.ts:
    generateThreadsPost(policy, format) → GPT 생성 문자열
    6가지 포맷 프롬프트 + Persona DNA 시스템 프롬프트 주입
- lib/threads-publisher.ts:
    publish(text) → Threads API 2단계 발행 → threadsId 반환
    getInsights(postId) → views·likes·replies·reposts 조회
- lib/seo.ts:
    buildMetaTags(post) → title·description·canonical·openGraph·other·jsonLd
    GEO region code 매핑 17개 시도
    FAQPage JSON-LD 자동 생성
- scripts/threads-post.ts:
    DB에서 RL 포맷 결정 → 정책 선택 → GPT 생성 → 발행 → DB 저장
- scripts/update-verdicts.ts:
    발행된 포스트 성과 수집 → calcVerdict → DB 업데이트
- scripts/ads-agent.ts:
    저효율 키워드 비활성화 (CTR<0.02% + 클릭0 + 노출>1000)
    검색어 리포트에서 신규 지원금 키워드 발굴
    건강점수 계산 (0~100점)
```

### DevOps 역할 상세
```
담당: app/api/ · mobile/ · next.config.ts · vercel.json
주요 작업:
- app/api/policies/route.ts: GET(목록+페이지네이션) + POST(생성+FAQ 포함)
- app/api/policies/[id]/route.ts: GET·PATCH·DELETE
- app/api/upload/route.ts: FormData → R2 PutObject → public URL 반환
- app/api/threads/publish/route.ts: policyId+format+content → 발행 → DB 저장
- app/api/threads/generate/route.ts: policyId+format → GPT 생성 → content 반환
- app/api/fcm/register/route.ts: token+platform → DB 저장
- next.config.ts: 301 리다이렉트 + rewrites + 이미지 도메인 허용
- mobile/App.tsx:
    WebView BASE_URL 로드
    FCM 토큰 → /api/fcm/register 전송
    앱 쿠키(app_mode=1) 설정 → Builder에서 AdSense 숨김 처리
    카카오 딥링크 처리
    하드웨어 뒤로가기 처리
- Vercel 배포: vercel env add로 환경변수 전체 설정
- Railway 배포: PostgreSQL 생성 → DATABASE_URL 복사 → Vercel 환경변수 추가
```

---

## 12. Phase별 구현 순서

```
Phase 1  (Day 1~3)   Chief
  - npx create-next-app@latest welfare-platform --typescript --tailwind --app
  - prisma/schema.prisma 전체 작성
  - npx prisma migrate dev --name init
  - package.json 의존성 정리

Phase 2  (Day 3~7)   Harvester 단독
  - crawler/ 전체 구현
  - 로컬 테스트: python main.py → WP 글 1개 실제 발행 확인

Phase 3  (Day 7~14)  Builder + Growth 병렬
  - Builder:  어드민 레이아웃 + 대시보드 + 에디터 + Threads 관리 페이지
  - Growth:   lib/ 전체 + scripts/ 전체

Phase 4  (Day 14~21) Builder + DevOps 병렬
  - Builder:  공개 사이트 + GEO 랜딩 + WP 리다이렉트
  - DevOps:   API Routes 전체 + next.config.ts + 배포 설정

Phase 5  (Day 21~28) Growth 단독
  - Threads 자동화 실서버 테스트
  - RL 판정 업데이트 테스트

Phase 6  (Day 28~35) Chief + DevOps
  - Vercel 배포 + Railway 연결
  - ads.txt 배포 확인
  - AdSense 심사 신청 (글 50개 이상 확인 후)
  - Google Search Console 사이트맵 제출

Phase 7  (병행)      DevOps
  - mobile/App.tsx React Native 앱
  - Android Play Store + iOS App Store 등록 (심사 1~2주)
```

---

## 13. 니치 확장 계획

```typescript
// config/niche.ts — CURRENT_NICHE 하나만 바꾸면 새 사이트
export const CURRENT_NICHE = 'welfare' // 현재

// 확장 예정:
// 'travel'     → 여행·호텔·렌트카 (Booking.com CPA 7~10%)
// 'recipe'     → 레시피·음식 (쿠팡 파트너스 3~12%)
// 'shopping'   → 쇼핑·핫딜 (쿠팡 파트너스 + 네이버쇼핑)
// 'investment' → 투자·재테크 (증권사 계좌개설 CPA 건당 3~10만원)

// 재사용되는 것:
// 어드민 대시보드 전체, RL 엔진, Threads 자동화
// SEO 자동화, 광고 에이전트, React Native 앱 (URL만 교체)

// 바꿔야 하는 것:
// RSS 소스 URL, GPT 시스템 프롬프트, 수익화 방식, 도메인
```

---

## 14. Claude Code 시작 명령어

### 첫 번째 세션 (Phase 1)
```
MASTER_CLAUDE.md를 읽어.
GovFlow Crew Chief로서 프로젝트를 시작해줘.

오늘 목표:
1. npx create-next-app@latest welfare-platform --typescript --tailwind --app --src-dir
2. MASTER_CLAUDE.md 섹션 4의 prisma 스키마를 prisma/schema.prisma에 작성
3. package.json을 MASTER_CLAUDE.md 섹션 2 기술스택 기반으로 작성
4. .env.example을 MASTER_CLAUDE.md 섹션 5 환경변수 목록으로 작성
5. npx prisma migrate dev --name init 실행
6. npm run dev 실행 확인
```

### 크롤러 세션 (Phase 2)
```
MASTER_CLAUDE.md를 읽어.
GovFlow Crew Harvester로서 crawler/ 디렉토리 전체를 만들어줘.

MASTER_CLAUDE.md 섹션 6의 RSS 소스를 사용하고
섹션 7의 GPT 리라이팅 원칙을 따를 것.
완성 후 python main.py로 테스트 실행해줘.
```

### 어드민 + lib 병렬 세션 (Phase 3)
```
MASTER_CLAUDE.md를 읽어.
GovFlow Crew Chief로서 서브에이전트 2개를 동시에 실행해줘:

에이전트 1 (Builder):
  app/(admin)/layout.tsx 부터 시작해서
  dashboard, 에디터, Threads 관리 페이지까지

에이전트 2 (Growth):
  lib/rl-engine.ts, lib/threads-generator.ts,
  lib/threads-publisher.ts, lib/seo.ts,
  scripts/threads-post.ts, scripts/update-verdicts.ts
  순서대로 완성

두 에이전트가 건드리는 파일이 겹치지 않으므로 병렬 실행 가능.
```

### 배포 세션 (Phase 6)
```
MASTER_CLAUDE.md를 읽어.
GovFlow Crew DevOps로서 배포를 완성해줘.

1. vercel --prod 실행
2. MASTER_CLAUDE.md 섹션 5의 환경변수를 전부 vercel env add로 설정
3. public/ads.txt 생성 (pub 코드는 AdSense 승인 후 교체)
4. app/sitemap.ts 작성
5. 배포 URL 확인
```

---

## 15. 배포 체크리스트

```
□ prisma migrate deploy 완료
□ Vercel 환경변수 섹션 5 전체 설정
□ Railway PostgreSQL 생성 + DATABASE_URL 복사
□ Cloudflare DNS A레코드 → Vercel IP
□ SSL 인증서 자동 발급 확인
□ public/ads.txt 접근 확인 (yourdomain.com/ads.txt)
□ /sitemap.xml 접근 확인
□ robots.txt 설정
□ 크롤러로 글 50개 이상 생성 확인
□ 3주 이상 운영 기록
□ AdSense 심사 신청
□ Google Search Console 사이트맵 제출
□ IndexNow 키 설정
□ FCM 서버키 설정
□ mobile/App.tsx 빌드 + Play Store 등록
```

---

## 16. 참고 사이트 역분석 요약

```
bokjiking.co.kr / gp2.newsdaa.com:
- WordPress 멀티사이트 구조
- pub 코드 1개로 gp1·gp2·return24·savemoney 서브도메인 전체 커버
- RSS 크롤링 + GPT 리라이팅 + 하루 5~7개 자동 포스팅
- 서브도메인 허브에서 콘텐츠 서브도메인으로 내부 링크
- 외부 링크 항상 target="_blank" (체류시간 유지)

gg24.kr:
- 카카오 로그인 + 포인트/리워드 + 걸음수 게이미피케이션
- Swing2App 웹뷰 앱 (Play/App Store 등록)
- 익명 커뮤니티 (익명 라운지)
- FCM 푸시 알림으로 재방문 유도

govhelp.co.kr:
- Next.js 독립형 어드민 + Threads 자동화
- REWARD/PUNISHMENT RL 시스템 (포스트인컴 방식)
- Persona DNA로 계정 말투 일관성 유지
- 구글광고 에이전트 (매일 자동 키워드 최적화)
- 오늘의 미션 + 발행 스트릭 게이미피케이션
- IndexNow 새 글 즉시 구글 색인 요청
```
