# 정책자금넷 — Claude Code 완전 가이드

이 파일을 읽으면 이 프로젝트의 모든 맥락을 알 수 있다.
코드 작성 전 반드시 이 파일 전체를 읽을 것.

---

## 프로젝트 목적

정부 지원금·정책·뉴스를 자동 수집·큐레이션하는 콘텐츠 플랫폼.
참고 사이트: bokjiking.co.kr, gp2.newsdaa.com, gg24.kr, govhelp.co.kr

수익 구조:
1. Google AdSense (pub 코드 1개로 전체 서브도메인 커버)
2. CPA 제휴 (보험·대출·증권 계좌개설)
3. AdMob (앱 내 광고)

---

## 기술 스택

- Frontend: Next.js 14 (App Router) + Tailwind CSS
- Database: PostgreSQL on Railway
- 배포: Vercel (프론트+API) + Railway (DB+크롤러)
- 에디터: TipTap (리치 텍스트 + 이미지 업로드)
- 인증: NextAuth.js + 카카오 소셜 로그인
- 이미지: Cloudflare R2
- AI: OpenAI GPT-4o-mini (리라이팅) + DALL-E 3 (썸네일)
- 크롤러: Python (feedparser + newspaper3k + httpx)
- 앱: React Native 웹뷰 (Android + iOS)
- 자동화: GitHub Actions (크롤러 + Threads 발행 + 광고 에이전트)

---

## 전체 디렉토리 구조

```
welfare-platform/
├── CLAUDE.md                    ← 이 파일 (항상 읽을 것)
├── app/
│   ├── (public)/                ← 공개 사이트
│   │   ├── page.tsx             ← 메인 홈
│   │   ├── welfare/
│   │   │   ├── [slug]/page.tsx  ← 정책 상세
│   │   │   └── [region]/page.tsx← GEO 랜딩
│   │   └── news/[slug]/page.tsx ← 뉴스형 포스트
│   ├── (admin)/                 ← 어드민 (인증 필요)
│   │   ├── layout.tsx           ← 사이드바 + 탑바
│   │   ├── dashboard/page.tsx   ← 오늘의 미션 + 스트릭
│   │   ├── content/
│   │   │   ├── policy/page.tsx  ← 정책 목록 + 검색
│   │   │   └── policy/[id]/page.tsx ← TipTap 에디터
│   │   ├── api-status/page.tsx  ← API 소스별 수집 현황
│   │   ├── traffic/page.tsx     ← GEO 유입분석
│   │   ├── trending/page.tsx    ← 검색 트렌딩 + CPC
│   │   └── marketing/
│   │       ├── threads/page.tsx      ← 발행목록 + 생성
│   │       ├── threads-analytics/page.tsx ← RL 성과분석
│   │       ├── google-ads/page.tsx   ← 에이전트 + 리포트
│   │       ├── meta/page.tsx
│   │       ├── naver/page.tsx
│   │       ├── instagram/page.tsx
│   │       ├── tiktok/page.tsx
│   │       └── naver-blog/page.tsx   ← 포스트인컴 방식
│   ├── api/
│   │   ├── policies/route.ts
│   │   ├── upload/route.ts           ← R2 이미지 업로드
│   │   ├── threads/
│   │   │   ├── publish/route.ts
│   │   │   └── insights/route.ts
│   │   └── crawler/trigger/route.ts
│   └── sitemap.ts                    ← 자동 생성
├── components/
│   ├── editor/
│   │   ├── RichEditor.tsx            ← TipTap (툴바+버블메뉴)
│   │   ├── ImageUpload.tsx           ← R2 업로드 버튼
│   │   └── SeoPanel.tsx             ← GEO + 메타 + canonical
│   └── layout/
│       ├── Sidebar.tsx              ← 어드민 사이드바
│       └── Topbar.tsx
├── lib/
│   ├── prisma.ts                    ← DB 클라이언트
│   ├── rl-engine.ts                 ← REWARD/PUNISHMENT 판정
│   ├── threads-generator.ts         ← 포맷별 GPT 프롬프트 6종
│   ├── threads-publisher.ts         ← Threads API 발행
│   └── seo.ts                       ← GEO 메타태그 생성
├── crawler/
│   ├── main.py                      ← 스케줄러 진입점
│   ├── fetcher.py                   ← RSS + 공공API 수집
│   ├── rewriter.py                  ← GPT 리라이팅 + FAQ
│   ├── publisher.py                 ← WP REST API 포스팅
│   ├── image_gen.py                 ← DALL-E 썸네일
│   ├── db.py                        ← SQLite 중복방지
│   ├── keyword_filter.py            ← 키워드 스코어링
│   └── config.py                    ← 환경변수
├── prisma/schema.prisma
├── scripts/
│   ├── threads-post.ts              ← 일일 Threads 발행
│   ├── update-verdicts.ts           ← 성과 수집 + 판정
│   └── ads-agent.ts                 ← 구글광고 최적화
├── mobile/App.tsx                   ← React Native 웹뷰
├── config/niche.ts                  ← 니치별 설정 (확장용)
├── next.config.ts                   ← 301 리다이렉트
├── public/ads.txt                   ← AdSense 필수
└── .github/workflows/
    └── daily-automation.yml         ← 크롤러+Threads+광고

```

---

## DB 스키마 (prisma/schema.prisma)

```prisma
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
  publishedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  faqs         Faq[]
  threadsPosts ThreadsPost[]
}

model ThreadsPost {
  id          Int       @id @default(autoincrement())
  policyId    Int?
  policy      Policy?   @relation(fields: [policyId], references: [id])
  content     String    @db.Text
  format      String    // checklist·qa·story·number·compilation·cardnews
  threadsId   String?   // 발행 후 Threads 포스트 ID
  views       Int       @default(0)
  likes       Int       @default(0)
  comments    Int       @default(0)
  shares      Int       @default(0)
  verdict     String?   // REWARD·PUNISHMENT·NEUTRAL
  publishedAt DateTime?
  scheduledAt DateTime?
  status      String    @default("DRAFT")
  createdAt   DateTime  @default(now())
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
}

model UrlMapping {
  id       Int    @id @default(autoincrement())
  wpId     Int    @unique
  oldSlug  String
  newSlug  String
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

## 공공 API 소스

```python
RSS_SOURCES = [
    ("보건복지부",    "https://www.mohw.go.kr/react/rss/rss.jsp"),
    ("고용노동부",    "https://www.moel.go.kr/rss/news.rss"),
    ("정책브리핑",    "https://www.korea.kr/rss/news.xml"),
    ("연합뉴스경제",  "https://www.yna.co.kr/rss/economy.xml"),
    ("뉴시스사회",    "https://www.newsis.com/RSS/society.xml"),
    ("네이버사회",    "https://news.naver.com/rss/section/102.xml"),
]

MUST_KEYWORDS = ["지원금","환급금","보조금","바우처","장려금","급여","혜택","신청"]
```

공공데이터포털(data.go.kr)에서 발급 필요:
- 복지로 서비스 목록 API
- 고용24 채용공고 API
- 국세청 환급금 조회 API

---

## Threads RL 시스템

포맷 6종: checklist / qa / story / number / compilation / cardnews

판정 기준:
- REWARD: 댓글 2개 이상 OR 참여율 1% 이상
- PUNISHMENT: 조회 30 미만 AND 댓글 0
- NEUTRAL: 그 외

실제 성과 데이터 (govhelp.co.kr 역분석):
- 체크리스트: 평균 233 조회, 1.5% 참여
- Q&A: 평균 167 조회, 1.2% 참여
- 숫자강조: 평균 112 조회, 10.4% 참여 ← 댓글 유도 최고
- 스토리텔링: 평균 69 조회, 5.9% 참여
- 카드뉴스: 평균 61 조회, 3.3% 참여
- 컴필레이션: 평균 20 조회, 0.0% ← PUNISHMENT 多, 비중 줄일 것

Persona DNA (govhelp.co.kr 스타일):
- avg_chars: 400, 문장마다 줄바꿈
- 톤: 캐주얼·정보성·장난기
- 시그니처: "~하는게 핵심이야", "~하면 낫지 않나?"
- top_emoji: 🔥 ✅ 💸 😅

---

## AdSense 전략

- 루트 도메인으로 승인 → 서브도메인 전체 추가 심사 없이 커버
- WP에서 먼저 승인 → Next.js 이전 (같은 도메인 유지 시 재심사 없음)
- Auto Ads + 수동 슬롯(상단·인아티클·하단) 이중 배치
- 앱에서는 AdSense 숨기고 AdMob 별도 운영
- ads.txt: public/ads.txt에 반드시 배포

---

## SEO GEO 전략

- geo.region 메타태그 (ISO 3166-2:KR)
- FAQPage JSON-LD 스키마 (구글 FAQ 리치 결과)
- 지역별 랜딩: /welfare/seoul, /welfare/gyeonggi 등 17개
- GEO 대량 생성: 같은 정책을 지역별로 자동 변형
- IndexNow: 새 글 발행 시 구글 즉시 색인 요청
- WP → Next.js 이전: URL 1:1 매핑 + 301 리다이렉트

---

## 배포 인프라

```
사용자
  ↓ HTTPS
Cloudflare (DNS + CDN + SSL, 무료)
  ↓
Vercel (Next.js 웹사이트 + API Routes)
  ↓ DATABASE_URL 환경변수로 연결
Railway (PostgreSQL + 크롤러 Cron)

GitHub Actions (별도):
- 크롤러 매일 오전 11시
- Threads 발행 매일 오전 9시·오후 7시
- 광고 에이전트 매일 오전 2시
- 성과 수집 매일 자정
```

월 비용: Cloudflare 무료 + Vercel $20 + Railway $10 = 약 4~5만원

---

## 환경변수 목록

```env
DATABASE_URL=postgresql://...

OPENAI_API_KEY=sk-...

CF_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=welfare-images
R2_PUBLIC_URL=https://images.yourdomain.com

THREADS_USER_ID=...
THREADS_ACCESS_TOKEN=...

GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_DEV_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=...
GOOGLE_ADS_REFRESH_TOKEN=...

NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...

DATA_GO_KR_KEY=...
FCM_SERVER_KEY=...
```

---

## 구현 우선순위

Phase 1 (1~3일): Prisma 스키마 + Next.js 세팅 + Railway 연결
Phase 2 (3~7일): 크롤러 (fetcher·rewriter·publisher·image_gen)
Phase 3 (7~14일): 어드민 UI 전체
Phase 4 (14~21일): 공개 사이트 + SEO
Phase 5 (21~28일): Threads 자동화 + RL 엔진
Phase 6 (28~35일): Vercel 배포 + AdSense 심사 신청
Phase 7 (병행): React Native 앱

---

## 니치 확장 계획

정책자금 → 여행·호텔 → 쇼핑·핫딜 → 레시피 → 투자·재테크

config/niche.ts의 RSS 소스와 GPT 프롬프트만 바꾸면
어드민·RL·광고 에이전트·앱 전체 재사용 가능.

---

## Claude Code 서브에이전트 사용법

병렬 진행 가능한 조합:
- 에이전트 A: crawler/ 디렉토리 (Python 크롤러)
- 에이전트 B: app/(admin)/ (어드민 UI)
- 에이전트 C: app/(public)/ (공개 사이트)
- 에이전트 D: lib/ (RL 엔진·Threads·SEO 유틸)

같은 파일 동시 수정 금지. prisma/schema.prisma는 순서대로 처리.
