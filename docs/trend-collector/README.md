# 트렌드/뉴스 기반 실시간 정책 수집 시스템

> "유가 피해지원금", "추석 특별지원" 같이 **뉴스로 먼저 뜨는 긴급·임시 지원금**을
> 자동으로 포착해 관리자에게 알려주는 파이프라인.

---

## 왜 필요한가

### "유가 피해지원금" 같은 제도는 어디서 나오나?

한국의 지원금 제도는 크게 3가지 경로로 공개돼요.

1. **정식 등록 제도** — 보조금24 / 복지로 / 정부24 에 상시 게시 (우리 기존 수집기가 가져오는 제도들)
2. **부처 보도자료** — 기획재정부 / 산업통상자원부 / 농림축산식품부 / 해양수산부 / 국토교통부 등이 발표하는 **한시적·긴급 지원**
3. **지자체 임시 조례·고시** — 각 시·군·구가 재해·급등·경기불황 등에 대응해 자체 공지하는 **일회성 지원**

"유가 피해지원금", "폭염 취약계층 지원금", "자영업자 긴급재난지원금", "태풍 피해 복구 지원" 등은 대부분 **2번·3번 경로**로 먼저 뜨고, 한참 후에야 보조금24에 등록되거나 아예 등록되지 않아요. 뉴스가 더 빠른 이유.

### 현재 수집기의 사각지대

| 경로 | 현재 수집 | 제약 |
|---|---|---|
| 정부24 API | ✅ | 정식 등록 제도만 |
| 보조금24 | ✅ | 소상공인 위주, 긴급 제도 누락 많음 |
| 복지로 | ✅ | 복지 위주 |
| **부처 보도자료** | ❌ | 크롤링 필요 |
| **뉴스** | ❌ | 수집 + 키워드 추출 필요 |
| **트렌드 지표** | ❌ | 구글/네이버 트렌드 별도 API |

이 간극을 메우는 것이 이 수집기의 역할.

---

## 아키텍처

```
  ┌──────────────────────┐   ┌──────────────────────┐
  │  부처 보도자료 RSS    │   │  네이버 뉴스 검색 API │
  │  (korea.kr 등)       │   │  or RSS              │
  └──────────┬───────────┘   └──────────┬───────────┘
             │                          │
             ▼                          ▼
  ┌───────────────────────────────────────────────┐
  │         1) NewsItem 수집기 (Cron 30분)         │
  │    필터 키워드: 지원금 · 보조금 · 피해 · 긴급   │
  │                 재난 · 환급 · 특별지원          │
  └────────────────────┬──────────────────────────┘
                       │
                       ▼
  ┌───────────────────────────────────────────────┐
  │      2) 키워드 추출 & 정규화                    │
  │   (제목 파싱 + KoBERT/간단 Regex)              │
  └────────────────────┬──────────────────────────┘
                       │
                       ▼
  ┌───────────────────────────────────────────────┐
  │     3) TrendKeyword DB 저장 + 증가 감지         │
  │  score = newsCount(24h) × logTrendIndex         │
  └────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
  ┌───────────────┐       ┌──────────────────────┐
  │  Google Trends│       │  Naver DataLab API    │
  │  pytrends     │       │  (검색·뉴스 트렌드)   │
  └───────────────┘       └──────────────────────┘
                       │
                       ▼
  ┌───────────────────────────────────────────────┐
  │   4) 정책 후보(PolicyCandidate) 제안            │
  │   - 관련 뉴스 목록 + 부처·기관 추정             │
  │   - 관리자 페이지에서 1-클릭 승인 → Policy 등록 │
  └───────────────────────────────────────────────┘
```

---

## DB 스키마 (추가)

`schema_patch.sql` 참고. 핵심 테이블:

```prisma
model NewsItem {
  id            Int       @id @default(autoincrement())
  source        String    // "korea_kr" | "naver_news" | "daum_news"
  url           String    @unique
  title         String
  summary       String?   @db.Text
  publishedAt   DateTime
  agency        String?   // 부처/기관명
  matchedKeywords String[] // ["유가", "피해지원"]
  fetchedAt     DateTime  @default(now())

  @@index([source, publishedAt])
  @@index([publishedAt])
}

model TrendKeyword {
  id            Int       @id @default(autoincrement())
  keyword       String
  source        TrendSource   // GOOGLE_TRENDS | NAVER_DATALAB | NEWS_AGG
  score         Float         // 정규화된 점수 0~100
  newsCount24h  Int       @default(0)
  capturedAt    DateTime
  normalizedTopic String?    // "oil_damage_subsidy"

  @@index([capturedAt])
  @@index([score])
}

enum TrendSource {
  GOOGLE_TRENDS
  NAVER_DATALAB
  NEWS_AGG
}

model PolicyCandidate {
  id            Int       @id @default(autoincrement())
  topic         String    // 정규화 토픽
  suggestedTitle String
  agency        String?
  summary       String    @db.Text
  newsItemIds   Int[]     // 근거 뉴스
  trendScore    Float
  status        CandidateStatus @default(PENDING)
  reviewedBy    Int?      // 관리자 ID
  reviewedAt    DateTime?
  promotedPolicyId Int?   // 승인 시 생성된 Policy ID
  createdAt     DateTime  @default(now())
}

enum CandidateStatus {
  PENDING
  APPROVED
  REJECTED
  DUPLICATE
}
```

---

## 수집 소스

### A. 정부 보도자료 (최우선)

| 출처 | RSS / 엔드포인트 | 비고 |
|---|---|---|
| 대한민국 정책브리핑 | `https://www.korea.kr/rss/policyBriefing.xml` | 전 부처 통합 |
| 기획재정부 | `https://www.moef.go.kr/nw/news/press/rssList.do` | 재난지원금·추경 |
| 산업통상자원부 | `https://www.motie.go.kr/kor/article/rss/ATCL3030000000` | 유가·에너지 |
| 농림축산식품부 | `https://www.mafra.go.kr/mafra/rss/press.xml` | 농업 피해 |
| 해양수산부 | `https://www.mof.go.kr/rss/press.xml` | 어업 피해 |
| 국토교통부 | `https://www.molit.go.kr/rss/news.xml` | 주거·교통 |
| 고용노동부 | `https://www.moel.go.kr/rss/news.xml` | 고용·실업 |
| 행정안전부 | `https://www.mois.go.kr/rss/news.xml` | 재난 |

### B. 뉴스 포털

- **네이버 뉴스 검색 API**: `https://openapi.naver.com/v1/search/news.json` (무료, 일 25,000건)
  - 쿼리: `"지원금" OR "보조금" OR "피해지원"`
- **다음 뉴스 RSS**: `https://media.daum.net/syndication/politics.rss`
- 공식 검색어/실시간 검색어는 **Naver·Daum 모두 폐지** (2020년). 대안이 아래 C.

### C. 트렌드 지표

- **Google Trends**: PyTrends 라이브러리 / `gtrends4j` 등
  - 쿼리: 한국 지역, 24시간, "지원금/보조금/환급" 키워드 상승률
- **Naver DataLab API**: `https://openapi.naver.com/v1/datalab/search` (무료)
  - 5개 키워드까지 월 단위 검색량 비율 조회
- **Naver DataLab 쇼핑 인사이트**: 카테고리별이라 활용 제한적

---

## 실행 주기

```
모든 스케줄은 KST 기준 (Vercel Cron 이 용어상 UTC이므로 변환 필요)

*/30  06-23  *  *  *   # 보도자료 + 뉴스 수집 (30분마다)
0     09      *  *  *   # Google Trends 집계
0     09,21   *  *  *   # Naver DataLab 집계
5     09      *  *  *   # PolicyCandidate 생성 + 관리자 알림
```

---

## 필터 키워드 (초기)

아래 조건을 만족하면 `NewsItem` 저장 + 키워드 카운팅:

```ts
const KEYWORDS_MUST_INCLUDE = [
  '지원금', '보조금', '피해지원', '긴급지원',
  '환급', '바우처', '특별지원', '재난지원',
  '보상금', '수당', '장려금',
]

const KEYWORDS_EXCLUDE = [
  '주식', '코인', '가상자산', '임플란트',
  '정자은행', '도박', '성인',
]
```

`포함키워드 1개 이상 AND 제외키워드 0개` 일 때 저장.

---

## 관리자 플로우

### /admin/trends 페이지 (새로 만들 페이지)

1. **오늘의 급상승 키워드** (score 상위 20개)
2. **수집된 뉴스** (최근 24시간, 키워드 하이라이트)
3. **정책 후보** (자동 생성된 PolicyCandidate 목록)
4. 각 후보에 대해:
   - ✅ 승인 → Policy 로 승격, 제목/내용/링크/기관 자동 프리필
   - ❌ 기각 → REJECTED 상태, 이유 입력
   - 🔍 중복 → 기존 Policy 와 매칭

### 승인 시 자동으로 채워지는 필드
- `title` = suggestedTitle (편집 가능)
- `description` = summary (편집 가능)
- `applyUrl` = 뉴스에 링크가 있으면 그걸 → 관리자가 부처 공식 URL 로 교체
- `source` = agency (부처명)
- `sourceUrl` = 근거 뉴스 URL
- `status` = DRAFT (바로 PUBLISH 안 함, 관리자 재검토 후 수동 PUBLISH)
- `publishedAt` = 보도자료 발행일

---

## 중복 제거 로직

1. **URL 해시 기준** NewsItem 중복 제거 (@@unique on url)
2. **정규화 토픽** 생성: 제목에서 숫자/특수문자/조사 제거, 핵심 명사구만 남김
3. 기존 Policy 와 **코사인 유사도 ≥ 0.85** 이면 중복 처리
4. **7일 내 같은 토픽 3회 이상** 등장 시 PolicyCandidate 생성

---

## 법·저작권 체크

- 정부 보도자료(korea.kr 포함)는 **공공누리 1유형** — 출처 표시 후 자유 이용 가능 ✅
- 네이버 뉴스 검색 API는 **제목·링크·요약 정도만 저장** 가능, 본문 전재 금지 → 우리 DB에는 제목·URL·요약만 저장
- 다음 뉴스 RSS도 동일 원칙

우리는 **뉴스 본문을 재발행하지 않고**, 새 정책 정보를 인지하기 위한 **메타데이터만** 저장·활용하므로 저작권 이슈 없음.

---

## 파일 목차

| 파일 | 역할 |
|---|---|
| `schema_patch.sql` | NewsItem / TrendKeyword / PolicyCandidate 테이블 생성 |
| `news_rss_sources.ts` | 부처·뉴스 RSS URL 레지스트리 |
| `collect_news.ts` | RSS 파싱 → NewsItem 저장 |
| `naver_datalab.ts` | Naver DataLab API 호출 래퍼 |
| `google_trends.ts` | Google Trends 수집 (Node wrapper) |
| `keyword_extract.ts` | 키워드 정규화·유사도 계산 |
| `generate_candidates.ts` | 트렌드 + 뉴스 결합 → PolicyCandidate 생성 |
| `admin_trends_page.tsx` | `/admin/trends` 관리 UI |
| `cron_trend_route.ts` | Vercel Cron 엔드포인트 |

---

## 다음 단계 (구현 전 결정 필요)

1. **외부 API 키 확보**: Naver Developers(Client ID/Secret) 1회 등록 필요
2. **RSS 크롤 속도 제한**: 부처별 30분 간격으로 분산 (robots.txt 준수)
3. **번역/요약 모델**: 장기적으로는 제목·본문 → LLM 요약 → aiSummary 자동 생성도 연결 가능
4. **관리자 알림**: Slack webhook 또는 이메일 (PolicyCandidate 3개 이상 생성 시)

---

## 연관된 기존 자산

- **admin-speedup 패키지**의 `cron_collect_route.ts` 와 동일한 Vercel Cron 스키마 사용
- **ApiSource / CollectionRun** 테이블에 새 source 3개 추가:
  - `news_rss`
  - `naver_datalab`
  - `google_trends`
- `/admin/api-status` 페이지에 이 3개 source 도 자동 표시 (기존 코드 그대로 동작)
