# GovFlow Crew — Growth (그로스팀)
# 이 파일을 읽으면 lib/ + scripts/ 전체를 혼자 완성할 수 있다.

## 역할
SEO 자동화 · Threads RL 엔진 · 광고 에이전트 · SNS 자동화 담당.
사이트 트래픽과 수익을 극대화하는 모든 로직 구현.

---

## 전담 파일 목록

```
lib/
├── prisma.ts               DB 클라이언트 싱글턴
├── rl-engine.ts            REWARD/PUNISHMENT 판정 + 포맷 추천
├── threads-generator.ts    포맷별 GPT 프롬프트 6종 + Persona DNA
├── threads-publisher.ts    Threads API 발행 + 성과 조회
└── seo.ts                  GEO 메타태그 + JSON-LD 스키마 생성

scripts/
├── threads-post.ts         일일 Threads 자동 발행
├── update-verdicts.ts      성과 수집 + REWARD 판정 업데이트
└── ads-agent.ts            구글광고 키워드 자동 최적화
```

## 절대 건드리지 않는 파일
```
prisma/schema.prisma  (Chief 전담)
app/                  (Builder + DevOps 전담)
crawler/              (Harvester 전담)
```

---

## lib/prisma.ts 전체 코드

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## lib/rl-engine.ts 전체 구현 명세

```typescript
export type Format  = 'checklist' | 'qa' | 'story' | 'number' | 'compilation' | 'cardnews'
export type Verdict = 'REWARD' | 'PUNISHMENT' | 'NEUTRAL'

interface PostMetrics {
  views:    number
  likes:    number
  comments: number
  shares:   number
  format:   Format
}

// calcVerdict(m: PostMetrics): Verdict
// 판정 기준:
//   REWARD:      (likes + comments*2 + shares*3) / views >= 0.01  OR  comments >= 2
//   PUNISHMENT:  views < 30  AND  comments === 0
//   NEUTRAL:     그 외

// calcFormatStats(posts: (PostMetrics & { verdict: Verdict })[]): 배열
// 포맷별로 그룹화하여 집계:
//   count · avgViews(Math.round) · avgEngagement(소수점 1자리%) · rewardRate(정수%)
// 반환: avgViews 내림차순 정렬

// recommendNextFormat(stats): Format
// 상위 2개 포맷을 랜덤 교대 추천
// (한 포맷만 반복하면 알고리즘 페널티 방지)
// stats 비어있으면 'checklist' 반환

// DEFAULT_STATS (govhelp.co.kr 역분석 기준값)
export const DEFAULT_STATS = [
  { format: 'checklist'   as Format, count: 7, avgViews: 233, avgEngagement: 1.5,  rewardRate: 71  },
  { format: 'qa'          as Format, count: 1, avgViews: 167, avgEngagement: 1.2,  rewardRate: 100 },
  { format: 'number'      as Format, count: 3, avgViews: 112, avgEngagement: 10.4, rewardRate: 67  },
  { format: 'story'       as Format, count: 6, avgViews: 69,  avgEngagement: 5.9,  rewardRate: 83  },
  { format: 'cardnews'    as Format, count: 1, avgViews: 61,  avgEngagement: 3.3,  rewardRate: 100 },
  { format: 'compilation' as Format, count: 8, avgViews: 20,  avgEngagement: 0.0,  rewardRate: 0   },
]
```

---

## lib/threads-generator.ts 전체 구현 명세

```typescript
// generateThreadsPost(policy, format): Promise<string>
// policy: { title: string, content: string, applyUrl?: string }

// 시스템 프롬프트 (Persona DNA):
const SYSTEM = `당신은 대한민국 정부 지원금 정보를 SNS에서 바이럴하게 전달하는 전문가.
30~50대가 공감하는 캐주얼하고 정보성 있는 언어로 씁니다.
문장마다 줄바꿈. 시그니처: "~하는게 핵심이야", "~하면 낫지 않나?".
top_emoji: ✅ 🔥 💸 😅 중 1~3개 자연스럽게. 450자 이내.`

// FORMAT_PROMPTS (6종 전부 구현):
// checklist:   ✅ [조건] 형식 + 훅 ("이 조건 해당되면 무조건 신청해야 함")
// qa:          Q: [질문] 🤔 \n A: [2~3줄 답변] + CTA
// story:       공감 훅 → 상황 → 지원금 발견 → 혜택 → 마감 압박 → CTA
// number:      최대 OO만원! \n 1. [혜택→금액] \n 2. ... → CTA
// compilation: "신청 안 하면 후회" → 1. [정책-혜택] \n 2. ... → CTA
// cardnews:    강렬 한 줄 \n 📌 핵심만: · [포인트1] · [포인트2] → 링크

// 모델: gpt-4o-mini, max_tokens: 600, temperature: 0.85
```

---

## lib/threads-publisher.ts 전체 구현 명세

```typescript
// class ThreadsPublisher
// BASE_URL = 'https://graph.threads.net/v1.0'

// publish(text: string): Promise<string | null>
// 1단계: POST /{userId}/threads { media_type:'TEXT', text, access_token }
//        → containerId 반환
// await new Promise(r => setTimeout(r, 3000))  // Threads API 권장 딜레이
// 2단계: POST /{userId}/threads_publish { creation_id: containerId, access_token }
//        → id(threadsId) 반환
// 실패 시 null 반환

// getInsights(postId: string): Promise<{ views, likes, replies, reposts }>
// GET /{postId}/insights?metric=views,likes,replies,reposts&access_token=...
// data.data 배열에서 name별 values[0].value 추출
// 실패 시 { views:0, likes:0, replies:0, reposts:0 } 반환
```

---

## lib/seo.ts 전체 구현 명세

```typescript
// GEO 지역 코드 (17개 전부)
const REGION_CODES = {
  서울:'11', 경기:'41', 부산:'26', 인천:'28',
  대구:'27', 대전:'30', 광주:'29', 울산:'31',
  세종:'36', 강원:'42', 충북:'43', 충남:'44',
  전북:'45', 전남:'46', 경북:'47', 경남:'48', 제주:'50',
}

// buildMetaTags(post): 반환 객체
// post: { title, excerpt, slug, focusKeyword, geoRegion?, geoDistrict?, latitude?, longitude?, faqs?, publishedAt? }

// 반환:
// title:       "${geoTitle} | 복지길잡이"
// description: post.excerpt
// canonical:   "${BASE_URL}/welfare/${post.slug}"
// openGraph:   { type:'article', url, title:geoTitle, description, locale:'ko_KR', siteName:'복지길잡이' }
// other: {
//   'geo.region':   `KR-${REGION_CODES[geoRegion]}` or 'KR'
//   'geo.placename': geoDistrict or geoRegion or '대한민국'
//   'geo.position':  `${lat};${lng}` (있을 때만)
//   'ICBM':          `${lat}, ${lng}` (있을 때만)
// }
// jsonLd: { '@context':'https://schema.org', '@graph': [Article, FAQPage?] }

// Article JSON-LD:
// { '@type':'Article', '@id':url, headline, description, url,
//   inLanguage:'ko', datePublished, author:{@type:'Organization', name:'복지길잡이'},
//   publisher:{@type:'Organization', name:'복지길잡이', logo:{@type:'ImageObject', url:'...logo.png'}} }

// FAQPage JSON-LD (faqs 있을 때만):
// { '@type':'FAQPage', mainEntity: faqs.map(f => ({
//     '@type':'Question', name:f.q,
//     acceptedAnswer:{'@type':'Answer', text:f.a}
//   }))
// }
```

---

## scripts/threads-post.ts 전체 구현 명세

```typescript
// 1. DB에서 최근 30개 ThreadsPost 조회 (verdict not null)
// 2. 5개 이상이면 calcFormatStats로 실제 성과 계산
//    아니면 DEFAULT_STATS 사용
// 3. recommendNextFormat으로 오늘 사용할 포맷 결정
// 4. 오늘 아직 발행 안 된 PUBLISHED 정책 중 1개 선택
//    (threadsPosts 에 오늘 publishedAt >= 오늘00:00 없는 것)
// 5. generateThreadsPost(policy, format) → content
// 6. ThreadsPublisher.publish(content) → threadsId
// 7. prisma.threadsPost.create { policyId, content, format, threadsId, status:'PUBLISHED', publishedAt:now }
// 8. 정책 없으면 "오늘 발행할 정책 없음" 로그 후 종료
// 9. 발행 실패 시 process.exit(1)
```

---

## scripts/update-verdicts.ts 전체 구현 명세

```typescript
// 1. status='PUBLISHED' + threadsId not null 인 ThreadsPost 전체 조회
// 2. 각 포스트마다:
//    a. ThreadsPublisher.getInsights(threadsId) 호출
//    b. calcVerdict({views, likes, comments:replies, shares:reposts, format}) → verdict
//    c. prisma.threadsPost.update { views, likes, comments, shares, verdict }
//    d. await sleep(500) (API 호출 제한 방지)
// 3. 업데이트된 개수 로그
```

---

## scripts/ads-agent.ts 전체 구현 명세

```typescript
// Google Ads API 연동 (google-ads-api 패키지)
// 매일 자동 실행:

// 1. 저효율 키워드 비활성화
//    조건: impressions > 1000 AND clicks = 0 AND status = 'ENABLED' (LAST_7_DAYS)
//    → pause 처리

// 2. 신규 키워드 발굴
//    검색어 리포트에서 clicks > 3 (LAST_7_DAYS)
//    지원금 관련 단어 포함 여부 필터
//    → 신규 키워드로 추가

// 3. 건강점수 계산
//    base = 80
//    + added * 2 (추가된 키워드)
//    - deactivated * 0.5 (비활성화된 키워드)
//    min(0, max(100, 결과)) → 정수 반환

// 4. DB에 일일 리포트 저장 (날짜·건강점수·추가·비활성화 수)
```

---

## 필요한 환경변수

```env
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
THREADS_USER_ID=
THREADS_ACCESS_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEV_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_REFRESH_TOKEN=
```

---

## 완료 기준 체크리스트

- [ ] lib/prisma.ts — 싱글턴 클라이언트
- [ ] lib/rl-engine.ts — calcVerdict·calcFormatStats·recommendNextFormat·DEFAULT_STATS
- [ ] lib/threads-generator.ts — 6가지 포맷 프롬프트 + Persona DNA
- [ ] lib/threads-publisher.ts — publish() + getInsights()
- [ ] lib/seo.ts — buildMetaTags() GEO 17개 + FAQPage JSON-LD
- [ ] scripts/threads-post.ts — RL 포맷 결정 → 생성 → 발행 → DB 저장
- [ ] scripts/update-verdicts.ts — 성과 수집 → 판정 업데이트
- [ ] scripts/ads-agent.ts — 키워드 최적화 → 건강점수
- [ ] 테스트 — npx tsx scripts/threads-post.ts 실행 확인

---

## Chief에게 완료 보고 형식

```
[Growth] 완료 보고
- 완성된 파일: lib/prisma.ts · lib/rl-engine.ts · lib/threads-generator.ts · lib/threads-publisher.ts · lib/seo.ts · scripts/ 3개
- 테스트: threads-post.ts 실행 → Threads ID [번호] 발행 확인
- Builder에게 전달: lib/ export 타입 목록 (Format·Verdict·DEFAULT_STATS)
- DevOps에게 전달: scripts/ 실행 명령어 + 필요 환경변수
- 블로킹 이슈: 없음
```
