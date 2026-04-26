---
name: policy-writing
description: |
  지원금길잡이(govmate.co.kr) 정책 본문을 AEO/GEO/SEO 3중 최적화로 작성하는 스킬.
  제목 정규화, 시맨틱 블럭(H2/콜아웃/비교표), 클릭 유도 요소(CTA·내부링크), 신청링크 자동 부착,
  맞춤정책 필터링용 메타데이터(연령·소득·지역·가구·고용상태)를 포함한 정책 JSON 을 생성합니다.
  TRIGGERS: 정책 글 작성, 정책 본문, govmate, 지원금 글, AEO, GEO, SEO, 맞춤정책, 정책 import,
  새 정책 추가, 고아 정책 채우기, claude-content batch.
version: 1.0.0
author: 지원금길잡이
---

# 정책 본문 작성 스킬 (govmate.co.kr 전용)

이 스킬은 지원금길잡이 플랫폼의 정책 페이지(`app/welfare/[slug]/page.tsx`)와 맞춤정책 매칭 엔진
(`lib/match.ts`)에 최적화된 본문을 생성하기 위한 표준입니다. 모든 신규/보완 정책은 이 스킬에
정의된 JSON 스키마와 본문 구조를 따라야 합니다.

---

## 0. 핵심 원칙 — AEO / GEO / SEO 3중 최적화

| 축 | 핵심 질문 | 본문에 반영해야 할 것 |
|----|----------|---------------------|
| **AEO** (Answer Engine Optimization) | ChatGPT·Perplexity·Google AI 가 즉답할 수 있는가? | 정의→대상→금액→방법 4단계 두괄식 / FAQPage Schema / 명확한 숫자·날짜 |
| **GEO** (Generative Engine Optimization) | 생성형 검색이 인용할 만큼 권위·구조가 있는가? | 출처 부처명, 시행 연도, 공식 URL, 통계, 마지막 업데이트 표기 |
| **SEO** (Search Engine Optimization) | 구글·네이버·다음에서 상위 노출되는가? | focusKeyword, metaDesc, 내부링크, 시맨틱 H2/H3, alt 텍스트 |

본문은 **반드시 4단 구조**(정의 → 대상/금액 → 신청 → FAQ)를 지켜야 함. 두괄식·숫자우선·짧은 문장.

---

## 1. JSON 스키마 (필수 + 선택 필드)

신규 정책 추가는 `scripts/import-new-policies.ts` 가, 기존 정책 본문 채움은
`scripts/import-claude-content.ts` 가 처리합니다. 두 스크립트 모두 아래 스키마를 받습니다.

### 1.1 필수 필드 (모든 정책)

```jsonc
{
  "title": "근로장려금",                 // ≤ 60자, 공식 명칭 + 지자체 접두 [구분자] 금지
  "categorySlug": "employment",         // 아래 §1.3 categorySlug 표 참조 (필수)
  "geoRegion": "전국",                   // "전국" | "서울" | "경기" | "부산" 등 (선택)
  "geoDistrict": null,                   // "강남구" 등 시·군·구 (선택)
  "deadline": "매년 5월 1일~5월 31일",   // 자유 문자열 또는 "상시"
  "applyUrl": "https://www.hometax.go.kr",  // **권장**: 공식 신청 URL 1개

  "excerpt": "한 문단 요약 (100~200자)",  // 카드/검색결과 노출, ≥ 20자
  "content": "<h2>...</h2>...",          // 본문 HTML, ≥ 300자 (실제 ≥ 600자 권장)
  "eligibility": "대상 자격 조건 ...",    // 평문, ≥ 30자
  "applicationMethod": "① ... ② ...",    // 단계별, ≥ 30자
  "requiredDocuments": "신청서, ...",    // 평문 또는 콤마 구분
  "metaDesc": "≤160자 메타 설명",        // SEO 핵심
  "focusKeyword": "근로장려금 신청",     // 2~3 단어 핵심키워드

  "faqs": [                              // 3~5 개 권장 (AEO 핵심)
    { "question": "...", "answer": "..." }
  ]
}
```

### 1.2 맞춤정책 필터링 메타데이터 (선택, 권장)

`lib/match.ts` 의 매칭 알고리즘이 사용자 프로필(연령·소득·지역·가구상황)과 대조합니다.
**가능하면 모두 채워야** 맞춤정책 추천 정확도가 올라갑니다.

```jsonc
{
  "tags": [                              // 검색·필터·연관정책 추천에 사용
    "청년", "저소득", "주거", "월세", "무주택"
  ],
  "targeting": {                         // 매칭 엔진 입력값
    "ageMin": 19,                        // 만 나이, null 허용
    "ageMax": 34,
    "incomeMaxMonthly": 2000000,         // 월소득 상한 (원), null 허용
    "incomeBracketCode": "MID_60",       // 중위소득 코드: MID_30/50/60/75/100/120/150
    "householdTypes": ["청년단독", "청년1인"],  // 가구유형 코드
    "employmentStatus": ["근로자", "구직자", "프리랜서"],
    "region": ["전국"],                  // 또는 ["서울","경기"]
    "lifeEvents": ["출산", "결혼", "이사", "실직"],  // 생애사건 트리거
    "specialGroups": ["장애인", "다자녀", "한부모", "탈북민", "보훈"],
    "exclusions": ["주택소유자", "공무원", "대기업"]
  }
}
```

### 1.3 categorySlug 표 (10개 — DB 와 1:1 일치)

| slug | name (DB) | 사용 가이드 |
|------|-----------|------------|
| `subsidy` | 지원금 | 현금성 보편/소득 지원, 양육·돌봄 현금급여, 연금성 (생계급여, 부모급여, 다자녀, 장애인연금) |
| `grant` | 보조금 | 매칭형 적금, 이자 매칭, 사업 보조금 (청년도약·내일저축계좌, 장병적금) |
| `voucher` | 바우처 | 카드/포인트 형태로 사용처 제한 (첫만남, 농식품, 평생교육, 문화) |
| `refund` | 환급금 | 세금 환급·소득공제·세액공제 (유류세 환급, 연말정산) |
| `loan` | 대출 | 정책 대출 상품 (햇살론, 디딤돌, 버팀목) |
| `housing` | 주거 | 주거 임대·청약·LH·SH 사업 (LH 든든주택, 청년월세) |
| `education` | 교육 | 학자금·교육비·평생교육·직업훈련 (교육급여, 내일배움카드) |
| `medical` | 의료 | 의료비·건강검진·예방접종 (의료급여, 본인부담경감) |
| `employment` | 고용 | 취업지원·구직·창업·고용보험 (국민취업, 근로장려, 청년도전) |
| `culture` | 문화 | 문화비·예술·체육·관광 (문화비공제, 청년문화패스) |

**모호할 때 우선순위**: 사용자가 받는 형태 우선 → 환급/대출/바우처/보조금 ≫ 카테고리(주거·교육·의료·고용·문화) ≫ 지원금(기본값)

---

## 2. 본문 HTML 표준 블록 구조

### 2.1 4단 구조 (필수)

```html
<h2>{policyTitle}이란</h2>
<p>{1~2 문장 정의 + 도입 연도 + 운영 부처}</p>

<h2>지원 내용 (YYYY년 기준)</h2>
<ul>
  <li>{명확한 숫자 1}</li>
  <li>{명확한 숫자 2}</li>
</ul>

<h2>대상 자격</h2>
<ul>
  <li>{대상 1: 연령}</li>
  <li>{대상 2: 소득/재산}</li>
  <li>{제외 대상}</li>
</ul>

<h2>신청 방법</h2>
<p>{1~2 문장 요약}</p>

<h2>신청 시기 / 지급 시기</h2>
<p>{날짜 위주}</p>
```

각 H2 섹션은 1~3 문단 또는 4~7 줄 bullet. **문단당 평균 80자 이하**. 모바일 가독성 우선.

### 2.2 클릭 유도 요소 (선택, 권장)

본문 내부에 다음 컴포넌트형 HTML 을 삽입하면 프론트엔드(`app/welfare/[slug]/page.tsx`)가
스타일링하여 박스/버튼/배지로 렌더합니다.

#### (a) 콜아웃 박스 (TL;DR / 핵심요약)
```html
<div class="callout callout-info">
  <strong>한눈에 보기:</strong> 만 19~34세 청년이 월 70만 원 적립 시 5년 후 약 5,000만 원
</div>
```
지원 클래스: `callout-info` (파랑) | `callout-warn` (주황) | `callout-success` (녹색) | `callout-danger` (빨강)

#### (b) 비교표 (지원금액·대상별)
```html
<table class="policy-table">
  <thead>
    <tr><th>구분</th><th>한도</th><th>금리</th></tr>
  </thead>
  <tbody>
    <tr><td>일반</td><td>2.5억</td><td>3.0%</td></tr>
    <tr><td>신혼</td><td>4억</td><td>2.0%</td></tr>
  </tbody>
</table>
```

#### (c) CTA 신청 버튼 (본문 내부)
```html
<a href="https://www.hometax.go.kr" class="cta-apply" target="_blank" rel="noopener noreferrer">
  국세청 홈택스에서 바로 신청 →
</a>
```
프론트엔드는 `class="cta-apply"` 를 큰 주황 버튼으로 렌더. 본문 끝 또는 신청 방법 섹션 직후
1~2개만 사용.

#### (d) 단계 카드 (신청 절차)
```html
<ol class="steps">
  <li><strong>1단계.</strong> 홈택스 회원가입</li>
  <li><strong>2단계.</strong> 신청·제출 → 근로장려금 신청</li>
  <li><strong>3단계.</strong> 자격 심사 (약 30일)</li>
  <li><strong>4단계.</strong> 8월 말 계좌 입금</li>
</ol>
```

#### (e) 내부링크 (관련 정책)
```html
<p>참고: <a href="/welfare/자녀장려금-XXXXXX">자녀장려금</a>과 동시 신청 가능합니다.</p>
```
같은 카테고리 또는 보완 관계인 정책으로 1~3개 내부링크 권장 (체류시간·SEO 향상).

### 2.3 신청링크(applyUrl) 처리 규칙

- **반드시 공식 정부 사이트만** (`*.go.kr`, `*.or.kr` 우선). 민간 블로그·뉴스 금지.
- 다중 링크가 필요하면 `applyUrl` 에는 대표 1개만, 나머지는 본문 마지막 H2 "참고링크" 섹션에:
```html
<h2>참고 링크</h2>
<ul>
  <li><a href="https://www.bokjiro.go.kr" target="_blank" rel="noopener">복지로</a> — 통합 신청</li>
  <li><a href="https://www.gov.kr" target="_blank" rel="noopener">정부24</a> — 모바일 신청</li>
</ul>
```
- `applyUrl` 부재 시 프론트엔드는 자동으로 부처별 기본 URL을 매핑(예: `bokjiro.go.kr`).

---

## 3. AEO / GEO 강화 가이드라인

### 3.1 AEO: 답변 엔진이 요약하기 쉬운 본문

- **첫 문단에 정의 + 핵심 숫자**: "근로장려금은 연소득 X만 원 이하 가구에 최대 Y만 원을 지급하는…"
- **모든 H2 아래 1~2문장 요약**: AI 가 H2 단위로 발췌하기 쉬움.
- **숫자는 콤마 + 단위 명시**: `5,000,000원` ❌ → `500만 원` ✅ (한국어 사용자 우선)
- **FAQ 는 3~5개**: 자주 묻는 질문 형태로 작성, 답변은 1~3문장.
  - 좋은 질문 예: "월 70만 원을 다 납입해야 하나요?", "중도 해지하면 어떻게 되나요?"
  - 나쁜 질문 예: "이 정책의 의의는 무엇인가요?" (검색 의도 없음)
- 프론트엔드는 FAQ 를 자동으로 [`FAQPage` JSON-LD schema](https://schema.org/FAQPage) 로 출력.

### 3.2 GEO: 생성형 엔진이 인용하는 권위

- 본문 내 출처: "보건복지부", "국세청", "여성가족부" 등 부처명 명시.
- 시행 연도: "2008년 도입", "2026년 개정" 등 시점 정보.
- 통계 인용: "2024년 기준 ○○○만 명 수혜" 등 (사실만 — 추측 금지).
- 마지막 업데이트: 본문 끝에 "{YYYY년 X월 기준}" 표기 권장.

### 3.3 SEO: 검색엔진 상위노출

- **focusKeyword**: 정책명 + 동사 (예: "근로장려금 신청", "디딤돌대출 한도")
- **metaDesc** (≤160자): 핵심 숫자 + 자격 + 행동유도 (예: "근로장려금 2026 신청 자격, 지급액(최대 330만 원), 5월 신청 일정과 홈택스 신청 절차 한눈에 정리.")
- **slug**: 자동 생성 (한글 + nanoid 6자리). 임의 수정 금지.
- **H2/H3 위계**: H1 은 페이지 제목 자동, 본문 최상위는 H2.
- **이미지**: 사용 시 `<img alt="...">` 필수. 단 govmate 본문은 텍스트 위주.

---

## 4. 맞춤정책 매칭 (`lib/match.ts`) 연동 규칙

사용자가 마이페이지에서 입력한 프로필과 정책의 `targeting` 메타데이터가 자동 대조됩니다.
다음을 정확히 입력해야 추천 품질이 보장됩니다.

### 4.1 연령 매칭
- 청년 정책: `ageMin: 19, ageMax: 34` (병역 가산은 `ageMaxAdjusted: 39` 가능)
- 노인 정책: `ageMin: 65`
- 영유아 정책: `ageMax: 5` (만 나이)
- 무관: 둘 다 `null`

### 4.2 소득 매칭
- 정확한 월소득 상한이 있으면 `incomeMaxMonthly` 에 원 단위로.
- 중위소득 기준이면 `incomeBracketCode`:
  - 생계급여 → `MID_32`
  - 의료급여 → `MID_40`
  - 주거급여 → `MID_48`
  - 교육급여 → `MID_50`
  - 차상위 → `MID_50`
  - 청년월세 → `MID_60` (본인) + `MID_100` (원가구)
  - 부모급여·아동수당 → `null` (소득무관)

### 4.3 지역 매칭
- 전국 사업: `region: ["전국"]`
- 광역만: `region: ["서울"]`
- 시·군·구만: `region: ["서울:강남구"]` 또는 `geoDistrict` 별도

### 4.4 생애사건 트리거
- 출산 → 첫만남이용권, 부모급여, 다자녀 자동 추천
- 이사 → 청년월세, LH 든든주택
- 실직 → 국민취업지원, 실업급여
- 결혼 → 신혼 디딤돌, 신혼 든든주택

### 4.5 특수계층
- 다자녀(2명 이상): `specialGroups: ["다자녀"]`
- 한부모: `["한부모"]`
- 장애인: `["장애인"]`
- 보훈대상: `["보훈"]`
- 탈북민: `["탈북민"]`
- 결혼이민자: `["결혼이민자"]`

### 4.6 제외 조건
`exclusions` 에 입력하면 사용자 프로필이 일치할 때 추천에서 자동 제외됩니다.
- 예: 햇살론 → `["연체자", "회생절차중"]`
- 예: 디딤돌대출 → `["주택소유자"]`
- 예: 두루누리 → `["공무원", "대기업종사자45미만"]`

---

## 5. 작업 워크플로

### 5.1 신규 정책 추가 (Phase A 형식)

1. `tmp/new-policies-batchN.json` 파일 생성 (배열, 5~10개씩)
2. 각 항목에 §1 스키마 + §4 targeting 메타데이터 채움
3. categorySlug 는 §1.3 표에서 선택 (DB 에 존재하는 10개만)
4. 본문은 §2 의 4단 구조 + 클릭요소
5. 드라이런 검증:
   ```bash
   DRY=1 npx tsx scripts/import-new-policies.ts tmp/new-policies-batchN.json
   ```
6. 통과 시 실제 import:
   ```bash
   npx tsx scripts/import-new-policies.ts tmp/new-policies-batchN.json
   ```

### 5.2 기존 정책 본문 채움 (Phase B 형식)

1. 고아 정책 리스트 추출:
   ```bash
   npx tsx scripts/find-orphan-policies.ts
   ```
2. `tmp/orphan-policies-*.json` 의 id·title 을 batch JSON 의 `id` 필드로 매핑
3. 본문 내용은 §2~§4 동일
4. import:
   ```bash
   npx tsx scripts/import-claude-content.ts tmp/claude-content-batch-N.json
   ```

### 5.3 검증 단계 (필수)

- import 직후 prod URL 확인:
  ```bash
  curl --compressed -sS "https://govmate.co.kr/welfare/{slug}" | grep -E '<title>|canonical'
  ```
- title 에 `…정책을 찾을 수 없습니다…` 가 나오면 slug 확인.
- canonical href 가 자기 자신이 아닌 원본을 가리키면 정상(파생본).
- FAQ JSON-LD 가 `<script type="application/ld+json">` 으로 출력되는지 view-source.

---

## 6. 작성 시 체크리스트 (제출 전 확인)

```
[ ] title 60자 이하, 공식 명칭, 접두 지자체명 [대괄호] 형식
[ ] categorySlug 가 DB 10개 중 하나
[ ] excerpt 100~200자, 첫 문장에 핵심 숫자
[ ] content 600자 이상, H2 4개 이상, 불릿 또는 표
[ ] applyUrl *.go.kr 또는 *.or.kr
[ ] metaDesc 160자 이하, focusKeyword 포함
[ ] FAQ 3~5개, 검색의도가 명확한 질문
[ ] targeting.ageMin/Max·incomeBracketCode·region 채움
[ ] tags 5개 내외 (검색 키워드 + 카테고리 보조)
[ ] CTA 1~2개 (cta-apply 클래스)
[ ] 내부링크 1~3개 (같은 카테고리 또는 보완 정책)
[ ] 본문 마지막에 마지막 업데이트 날짜
```

---

## 7. 참고 파일

- 스키마 정의: `prisma/schema.prisma` (Policy, Faq 모델)
- 카테고리 라벨: `lib/categories.ts`
- 매칭 엔진: `lib/match.ts`
- 정책 페이지: `app/welfare/[slug]/page.tsx`
- import 스크립트: `scripts/import-new-policies.ts`, `scripts/import-claude-content.ts`
- 템플릿 예시: `.claude/skills/policy-writing/templates/policy-template.json`

---

마지막 업데이트: 2026년 4월
