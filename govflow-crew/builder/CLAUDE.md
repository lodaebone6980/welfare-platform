# GovFlow Crew — Builder (프론트팀)
# 이 파일을 읽으면 어드민 UI + 공개 사이트를 혼자 완성할 수 있다.

## 역할
어드민 대시보드 전체 UI와 공개 사이트 페이지 담당.
Next.js 14 App Router + Tailwind CSS.

---

## 전담 파일 목록

```
components/
├── layout/Sidebar.tsx         어드민 사이드바 내비게이션
├── layout/Topbar.tsx          상단 타이틀 + 버튼
├── editor/RichEditor.tsx      TipTap 에디터
├── editor/ImageUpload.tsx     R2 업로드 버튼
└── editor/SeoPanel.tsx        GEO + 메타 + 발행설정

app/(admin)/
├── layout.tsx                 Sidebar + 인증 체크
├── dashboard/page.tsx         오늘의 미션 + 스트릭 + 메트릭
├── content/policy/page.tsx    정책 목록 + 검색 + 필터
├── content/policy/[id]/page.tsx  에디터 + SEO 패널
├── content/bulk/page.tsx      GEO 대량 생성
├── content/category/page.tsx  카테고리 관리
├── api-status/page.tsx        API 소스별 수집 현황
├── traffic/page.tsx           GEO 지역별 유입 분석
├── trending/page.tsx          검색 트렌딩 + CPC 단가
└── marketing/
    ├── threads/page.tsx            발행목록 + 생성탭
    ├── threads-analytics/page.tsx  RL 포맷별 성과차트
    ├── google-ads/page.tsx         에이전트 + 건강점수
    ├── meta/page.tsx
    ├── naver/page.tsx
    ├── instagram/page.tsx
    ├── tiktok/page.tsx
    └── naver-blog/page.tsx         포스트인컴 방식

app/(public)/
├── page.tsx                   메인 홈
├── welfare/[slug]/page.tsx    정책 상세 (FAQPage 스키마 + AdSense)
└── welfare/[region]/page.tsx  GEO 랜딩 (17개 시도)

app/wp-redirect/[id]/page.tsx  WP ?p=ID → 새 슬러그 리다이렉트
app/login/page.tsx             NextAuth 로그인 페이지
```

## 절대 건드리지 않는 파일
```
app/api/          (DevOps 전담)
lib/              (Growth 전담)
prisma/           (Chief 전담)
crawler/          (Harvester 전담)
```

---

## Sidebar.tsx 구현 명세

```tsx
// 메뉴 구조 (전체)
const NAV = [
  { label: '대시보드', href: '/admin' },
  {
    label: '콘텐츠',
    children: [
      { label: '정책 관리',   href: '/admin/content/policy' },
      { label: '대량 생성',   href: '/admin/content/bulk' },
      { label: '카테고리',    href: '/admin/content/category' },
    ]
  },
  {
    label: '데이터',
    children: [
      { label: 'API 수집현황', href: '/admin/api-status' },
      { label: '유입 분석',   href: '/admin/traffic' },
      { label: '검색 트렌딩', href: '/admin/trending' },
    ]
  },
  {
    label: '마케팅 · 광고',
    children: [
      { label: '구글광고 에이전트', href: '/admin/marketing/google-ads' },
      { label: 'Meta 광고',         href: '/admin/marketing/meta' },
      { label: '네이버 광고',       href: '/admin/marketing/naver' },
    ]
  },
  {
    label: 'SNS 관리',
    children: [
      { label: 'Threads 관리',  href: '/admin/marketing/threads',           badge: 2 },
      { label: 'Threads 성과',  href: '/admin/marketing/threads-analytics' },
      { label: '인스타그램',    href: '/admin/marketing/instagram' },
      { label: '틱톡',          href: '/admin/marketing/tiktok' },
      { label: 'N 블로그',      href: '/admin/marketing/naver-blog' },
    ]
  },
]

// active 판정: pathname === href 또는 pathname.startsWith(href) (단 /admin 제외)
// 로고: 왼쪽 초록 점 + "지원금길잡이 Admin"
// 하단: "↗ 사이트로 이동" (target="_blank")
```

---

## 대시보드 page.tsx 구현 명세

```tsx
// 데이터 소스: DB에서 직접 조회 (서버 컴포넌트)
// import { prisma } from '@/lib/prisma'

// 표시할 것:
// 1. 오늘의 미션 카드
//    - 오늘 publishedAt >= 오늘 00:00 인 ThreadsPost 카운트
//    - DAILY_GOAL = 3
//    - 프로그레스바 (달성 시 초록, 미달성 시 회색)
//    - 완료 시 "완료! 오늘 발행 목표 달성 🎉"

// 2. 발행 스트릭 카드
//    - 연속 발행일 계산 (어제부터 역산하여 ThreadsPost 있으면 +1)
//    - 7일 이상 시 "🔥 7일 이상 연속 발행 중!"

// 3. 메트릭 카드 4개 (bg-secondary, border-radius-md)
//    - 발행된 정책 수 (status=PUBLISHED count)
//    - 오늘 Threads 발행 수
//    - REWARD율 % (7일 기준)
//    - 최고 포맷 이름 + 평균 조회수

// 4. 최근 발행 정책 테이블 (5개)
//    - 정책명·카테고리·조회수

// 5. RL 학습 요약
//    - lib/rl-engine.ts의 DEFAULT_STATS 또는 실제 DB 데이터
//    - 포맷별 avgViews 가로 바차트
//    - 추천 포맷 텍스트: "추천: {1위} + {2위} 위주 발행"
```

---

## TipTap 에디터 구현 명세

```tsx
// extensions:
// StarterKit, Image, Link, Table, TableRow, TableCell, TableHeader, Placeholder

// 툴바 버튼 (순서대로):
// B · I · H2 · H3 · [구분선] · 목록 · 번호목록 · 표 · [구분선] · 이미지 · CTA버튼 · FAQ블록

// 버블 메뉴 (텍스트 선택 시 플로팅):
// B · I · 링크

// CTA버튼 삽입:
// <p><a href="" class="cta-button" target="_blank" rel="noopener">지금 신청하기 →</a></p>

// FAQ블록 삽입:
// <div class="faq-block">
//   <details><summary>Q. 신청 대상은?</summary><p>A. 답변</p></details>
//   <details><summary>Q. 신청 방법은?</summary><p>A. 답변</p></details>
//   <details><summary>Q. 지원 금액은?</summary><p>A. 답변</p></details>
// </div>

// 이미지 업로드: ImageUpload 컴포넌트 → /api/upload POST → URL 반환 → setImage
```

---

## SeoPanel 구현 명세

```tsx
interface SeoPanelData {
  focusKeyword: string       // 포커스 키워드
  metaDesc:     string       // 메타 디스크립션 (160자 제한 + 카운터)
  canonical:    string       // Canonical URL
  geoRegions:   string[]     // GEO 타겟 지역 (멀티셀렉트)
  status:       'DRAFT' | 'REVIEW' | 'PUBLISHED'
  snsAutoShare: boolean      // SNS 자동 공유 토글
  fcmPush:      boolean      // FCM 푸시 발송 토글
  requestIndex: boolean      // 구글 색인 요청 토글
}

// GEO 지역 태그 목록 (17개 전부):
// 서울·경기·부산·인천·대구·대전·광주·울산·세종·강원·충북·충남·전북·전남·경북·경남·제주

// 선택된 지역 = 파란 배경 pill
// 미선택 지역 = 회색 테두리 pill
```

---

## Threads 관리 페이지 구현 명세

```tsx
// 상단 통계 카드 4개:
// 대기중(파랑) · 총발행 · 오늘발행 · 잔여(일 5건, 빨강)

// 연결 상태: 초록 점 + "@계정명 연결됨"

// 탭 3개:
// [발행됨 N] [대기중 N] [생성하기]

// 발행됨 탭 테이블 컬럼:
// 정책 · 콘텐츠(truncate) · 포맷배지 · 판정배지 · 발행일 · 보기↗

// 포맷 배지 색상:
const FORMAT_COLORS = {
  checklist:   'bg-green-100 text-green-700',
  qa:          'bg-blue-100 text-blue-700',
  story:       'bg-amber-100 text-amber-700',
  number:      'bg-red-100 text-red-700',
  compilation: 'bg-purple-100 text-purple-700',
  cardnews:    'bg-pink-100 text-pink-700',
}

// 판정 배지:
const VERDICT_COLORS = {
  REWARD:      'bg-green-500 text-white',
  PUNISHMENT:  'bg-red-500 text-white',
  NEUTRAL:     'bg-gray-400 text-white',
}

// 생성하기 탭:
// 정책 선택 드롭다운 (PUBLISHED 정책 목록)
// 포맷 선택 (pill 버튼 6개)
// "AI 자동 생성" 버튼 → POST /api/threads/generate
// 미리보기/수정 textarea (500자 카운터)
// "저장 & 발행" 버튼 → POST /api/threads/publish
```

---

## Threads 성과분석 페이지 구현 명세

```tsx
// 메트릭 카드 4개:
// 총발행 · 평균조회 · 평균참여율 · REWARD율(7일, 초록색)

// 포맷별 성과 바차트 (recharts BarChart):
// x축: 포맷명, y축: 평균 조회수
// 색상: 포맷별 FORMAT_COLORS와 통일

// Persona DNA 박스:
// 배경 bg-secondary, font-mono
// avg_chars · line_break · persona · vocabulary · top_emoji · content_strategy

// 최근 포스트 성과 테이블:
// 콘텐츠(180px truncate) · 포맷 · 조회 · 좋아요 · 댓글 · 참여율 · 판정
// 데이터: GET /api/threads/insights 또는 DB 직접 조회
```

---

## 구글광고 에이전트 페이지 구현 명세

```tsx
// 에이전트 상태 박스:
// - 건강점수 링 (border-radius:50%, border:3px, 점수/100 텍스트)
// - 활성화됨(초록) / 비활성화(빨강) 버튼
// - "수동 실행" 버튼 → POST /api/ads/run-agent
// - 주기: 24시간 | 마지막 실행 | 다음 실행

// 탭: 대시보드 · 에이전트 · 광고관리 · 키워드등록 · 전환추적

// 대시보드 탭:
// 키워드수·키워드추가·비활성화 카드 3개
// 노출수·클릭수·총비용·평균CPC 카드 4개
// 일별 추이 라인차트 (recharts LineChart, 노출·클릭·비용 3선)
// 광고그룹별 현황 테이블: 광고그룹 · 키워드수 · 활성 · 노출 · 클릭 · 비용 · CTR

// 일일 리포트:
// 날짜 탭 (최근 7일) → 선택한 날 리포트 표시
// 건강점수 · 총키워드 · 비활성화 · 키워드추가 카드 4개
```

---

## 정책 상세 페이지 구현 명세

```tsx
// app/(public)/welfare/[slug]/page.tsx

// generateStaticParams: PUBLISHED 정책 전체 slug 반환
// generateMetadata: lib/seo.ts의 buildMetaTags 사용
// revalidate: 3600 (ISR 1시간)

// 페이지 구조:
// 1. JSON-LD <script> 태그 (Article + FAQPage)
// 2. 카테고리 배지 (파란 pill)
// 3. 제목 h1
// 4. 발행일
// 5. AdSense 상단 슬롯 (data-ad-slot="1111111111")
// 6. 신청 버튼 박스 (applyUrl 있을 때만)
// 7. 본문 HTML (dangerouslySetInnerHTML)
// 8. AdSense 하단 슬롯 (data-ad-slot="3333333333")
// 9. FAQPage 스키마 마크업 섹션 (itemScope itemType)
// 10. 조회수 increment (fire-and-forget, catch 무시)

// AdSense 슬롯 코드:
// <ins className="adsbygoogle"
//      data-ad-client={process.env.ADSENSE_PUB_ID}
//      data-ad-slot="슬롯번호"
//      data-ad-format="auto"
//      data-full-width-responsive="true" />
```

---

## GEO 랜딩 페이지 구현 명세

```tsx
// app/(public)/welfare/[region]/page.tsx

// generateStaticParams: 17개 시도 전부 반환
const REGIONS = ['서울','경기','부산','인천','대구','대전','광주','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주']

// generateMetadata: geo.region 메타태그 포함
// <meta name="geo.region" content="KR-{지역코드}">
// <meta name="geo.placename" content="{시도명}">

// 페이지 구조:
// 1. 지역 배지 (파란 pill)
// 2. 제목: "{지역명} 지원금·정책 총정리"
// 3. 해당 geoRegion = region 인 PUBLISHED 정책 카드 그리드
// 4. 각 카드: 썸네일 + 제목 + 요약 + 신청마감 D-day + "자세히 보기" 링크
// 5. 관련 시도 링크 (다른 16개 지역 내부 링크)
```

---

## API 연동 방법 (DevOps 완료 전 mock 사용)

```typescript
// DevOps가 API 완성하기 전에는 mock 데이터로 UI 먼저 완성
// 예시:
const mockPolicies = [
  { id: 1, title: '에너지바우처', category: { name: '생활지원' }, viewCount: 12441 },
  { id: 2, title: '근로장려금',   category: { name: '세금혜택' }, viewCount: 9832 },
]

// DevOps 완료 후 실제 fetch로 교체:
const res = await fetch('/api/policies?status=PUBLISHED&take=20')
const { policies } = await res.json()
```

---

## 완료 기준 체크리스트

- [ ] Sidebar.tsx — 전체 메뉴 + active 상태
- [ ] 대시보드 — 오늘의 미션 + 스트릭 + 메트릭 + RL 요약
- [ ] RichEditor.tsx — 툴바 + 버블메뉴 + CTA + FAQ
- [ ] ImageUpload.tsx — /api/upload 연동
- [ ] SeoPanel.tsx — GEO 멀티셀렉트 + 발행 토글
- [ ] Threads 관리 — 발행됨 탭 + 생성하기 탭
- [ ] Threads 성과 — 바차트 + Persona DNA + 테이블
- [ ] 구글광고 에이전트 — 건강점수 + 일일리포트
- [ ] 정책 상세 — FAQPage 스키마 + AdSense 슬롯
- [ ] GEO 랜딩 — 17개 시도 페이지
- [ ] 반응형 — 768px 이하 모바일 확인

---

## Chief에게 완료 보고 형식

```
[Builder] 완료 보고
- 완성된 파일: [목록]
- 테스트: npm run dev 에서 /admin, /welfare/[slug], /welfare/seoul 접근 확인
- API 연동: mock 데이터 사용 중 / 실제 연동 완료
- 블로킹 이슈: DevOps API 완성 후 [파일명] fetch 교체 필요
```
