# Canonical 전략 메모 — 17개 지자체 중복 정책 처리

_2026-04-24 작성. 결정 맥락: 1307개 정책 중 지역별 74~79개씩 고르게 분포하는 패턴을 확인 → 실제로는 약 77개의 "국가 공통 정책"이 17개 시·도에 복제되어 있음._

## 1. 배경

`tmp/content-status-2026-04-24T06-45-49.json` 분석 결과:

- 전체 PUBLISHED: 1,307건
- 지역별 분포: 세종 79 / 강원 79 / 부산 78 / 경기 78 / 충북 78 / 인천 77 / 대구 77 / 전북 77 / 울산 77 / 대전 77 / 광주 77 / 충남 77 / 서울 76 / 전남 76 / 제주 75 / 경남 75 / 경북 74
- 17개 지역 × ≈77 = **1,309** ≈ 총합 1,307

즉 대다수 정책은 "기초연금", "의료급여", "주거급여" 등 **중앙정부 제도**를 17개 지자체별로 그대로 복제한 것. SEO 관점에서는 **중복 콘텐츠(duplicate content)** 로 간주될 위험이 크다.

## 2. 목표

1. **검색엔진 친화**: 동일 제도는 canonical 원본 1건만 색인되도록 한다.
2. **사용자 가치**: 지역 페이지는 접근성을 위해 유지하되, 원본을 참조하거나 지역별 차이(구·군 조례, 지자체 자체 가산금)만 강조한다.
3. **운영 효율**: Claude 본문 생성은 원본 77개만 집중하고, 나머지 지역 버전은 자동으로 상속·요약 처리한다.

## 3. canonical 원본 식별 알고리즘(안)

### 3.1 그루핑 키

다음 세 가지를 결합해 hash 생성:

```
key = normalize(title) + "|" + categorySlug + "|" + policyType
```

- `normalize(title)`: `[지역명]`, `[광역시]`, `(OO시)` 등 지역 접두사 제거 + 공백/특수문자 정규화
- 예: `[대구광역시] 의료급여 지원` → `의료급여 지원`
- `policyType`: 있는 경우 `NATIONAL` / `REGIONAL` 구분자

### 3.2 원본 선정 기준(우선순위)

동일 `key` 를 가진 여러 행 중 1건을 canonical 로 지정. 아래 순서대로 평가:

1. `geoRegion` 이 `전국` 또는 `NULL` 인 행이 있으면 → 그 행
2. `policyType = NATIONAL` 플래그가 있는 행이 있으면 → 그 행
3. `viewCount` 가 가장 높은 행
4. `publishedAt` 이 가장 오래된 행 (먼저 발행된 콘텐츠가 원본일 가능성)
5. `id` 가 가장 작은 행 (tiebreaker)

### 3.3 DB 스키마 변경(추후)

```prisma
model Policy {
  // ...
  canonicalId  Int?
  canonical    Policy?  @relation("CanonicalRef", fields: [canonicalId], references: [id])
  derivatives  Policy[] @relation("CanonicalRef")
}
```

- `canonicalId IS NULL` → 본인이 원본
- `canonicalId = X` → X 를 원본으로 참조하는 파생본

## 4. 단계별 실행 플랜

### Phase A — 식별 (읽기 전용)

**스크립트**: `scripts/identify-canonical.ts` (아직 미작성, 다음 배치)

역할:

1. 모든 PUBLISHED 정책을 key 로 그루핑
2. 그룹별 canonical 선정
3. `tmp/canonical-groups-<ts>.json` 에 저장
4. 그루핑 불가(1건뿐인 정책, 지역 고유 정책) 목록도 별도 저장

산출물 예:

```json
{
  "groups": [
    {
      "key": "의료급여 지원|medical|NATIONAL",
      "canonicalId": 12,
      "derivatives": [1352, 1775, ...],
      "count": 17
    },
    ...
  ],
  "solo": [42, 88, ...]
}
```

### Phase B — DB 반영

1. Prisma migration 으로 `canonicalId` 컬럼 추가
2. `scripts/apply-canonical.ts` 로 일괄 업데이트
3. 원본 77개의 본문은 Claude 가 작성(배치 단위)
4. 파생본은 본문을 별도로 생성하지 않고, 아래 Phase C 처리

### Phase C — 렌더링 전략

1. **정책 상세 페이지** (`app/(public)/welfare/[slug]/page.tsx`)
   - 자기가 원본이면 그대로 본문 렌더
   - 자기가 파생본이면:
     - `<link rel="canonical" href="/welfare/{canonical.slug}" />` 주입
     - 상단 `<aside>`: "본 정책은 전국 공통 제도입니다. {지역} 관할 창구에서 신청하세요." 안내
     - 본문은 canonical 본문을 재사용(SSR 시 fetch)
     - 푸터 바로 위에 "{지역} 담당 부서 / 전화번호 / 주소" 만 지역별로 출력

2. **sitemap.xml**
   - 파생본은 sitemap 에서 제외 (또는 canonical URL 만 포함)
   - 검색엔진에 원본 색인 유도

3. **목록 페이지**
   - 카테고리·지역 필터는 기존처럼 유지(UX)
   - 단, 정렬 시 canonical 이 우선 노출되도록 가중치 부여

### Phase D — 지역 차이 입력 창구

지자체가 자체 가산금·시군 조례 특례를 운영하는 경우, `PolicyRegionalDelta` 테이블을 신설해 차이점만 기록:

```prisma
model PolicyRegionalDelta {
  id         Int     @id @default(autoincrement())
  policyId   Int
  region     String
  extraNote  String?  // HTML 허용
  localUrl   String?  // 지자체 공식 안내 링크
  localPhone String?
  localDept  String?
  // ...
}
```

상세 페이지에서 canonical 본문 + 해당 지역 delta 를 결합해 렌더한다.

## 5. 위험 요소 & 완화

| 위험 | 완화 |
|---|---|
| 지역 페이지 트래픽 감소 | canonical 통합 후 몇 주간 GA 에서 비교, 감소가 크면 rel=canonical 만 두고 본문은 각자 유지 |
| 실제로 지역 조례가 다른 경우 (출산장려금 등) | `PolicyRegionalDelta` 로 보완 + canonicalId 를 NULL 처리해 독립 정책으로 유지 |
| 자동 그루핑 오탐 | Phase A 결과를 사람이 검토한 뒤 Phase B 적용 |
| 원본 id 가 나중에 변경될 위험 | `canonicalKey` (해시) 도 함께 저장해 id 변화에도 그룹 식별이 가능하도록 설계 |

## 6. 지금(2026-04-24) 실행 범위

- [x] 전략 문서화 (이 파일)
- [x] `scripts/archive-expired.ts` 작성 — 과거 마감 543건 ARCHIVED 전환 준비
- [ ] `scripts/identify-canonical.ts` (다음 커밋)
- [ ] Prisma migration `add-canonical-ref` (다음 커밋)
- [ ] `apply-canonical.ts` + 상세 페이지 canonical 렌더 (Phase B~C)

## 7. 콘텐츠 생성 우선순위 재조정

| 순위 | 그룹 | 건수 | 비고 |
|---|---|---|---|
| 1 | 이미 뽑은 priority 11건 | 11 | 현재 batch1 작성 완료 |
| 2 | 국가 공통 원본 (canonical) | ~77 | Phase A 후 확정 |
| 3 | 지역 고유 정책 (solo, 지자체 자체 조례) | 추정 100~150 | canonical 불가 → 개별 작성 |
| 4 | 파생본 지역 페이지 | 나머지 ≈1,000 | 본문 미작성 → canonical 참조로 해결 |

이 전략대로면 **실제로 Claude 가 본문을 써야 하는 분량은 77 + (solo 100~150) ≈ 180~230건** 으로 줄어든다. 1,307건 전부 쓰는 것에 비해 1/7 수준이며, 품질도 훨씬 일관되게 유지 가능.
