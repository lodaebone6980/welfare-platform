# AdSense 재승인 실행 플랜

Last updated: 2026-05-12

## 목표

`www.govmate.co.kr`의 "가치가 별로 없는 콘텐츠" 거절을 해결하기 위해, 심사자가 보는 공개 페이지를 아래 상태로 만든다.

- 얇거나 자동 생성에 가까운 정책 페이지는 검색 색인과 sitemap에서 제외한다.
- 색인되는 정책 페이지에는 충분한 본문, 공식 출처, 검수일, 신청 방법, 지원 대상이 보이게 한다.
- 로그인, 알림, 마이페이지, 검색 결과, 도구성 화면은 AdSense 심사 대상 콘텐츠처럼 보이지 않게 한다.
- 광고 코드는 사이트 연결용으로 유지하되, 승인 전 빈 광고 단위는 렌더링하지 않는다.

## Google 기준 요약

심사 기준으로 사용할 공식 문서:

- AdSense 프로그램 정책: https://support.google.com/adsense/answer/48182
- AdSense 초보자 정책 가이드: https://support.google.com/adsense/answer/23921
- 계정 미승인/콘텐츠 품질 안내: https://support.google.com/adsense/answer/81904
- Publisher Policies, inventory value: https://support.google.com/adsense/answer/10502938
- 저가치 또는 publisher content 없는 화면: https://support.google.com/publisherpolicies/answer/11112688
- AdSense 사이트 연결/심사: https://support.google.com/adsense/answer/7584263

핵심 해석:

- 사이트는 독자적이고 유용한 콘텐츠를 제공해야 한다.
- 제목만 있거나 짧은 목록, 거의 복사된 자료, 공사 중 화면은 승인 가능성이 낮다.
- 검색 결과, 로그인, 알림, 계정 화면처럼 콘텐츠가 주목적이 아닌 화면에는 광고를 두지 않는다.
- 자동 생성 콘텐츠는 사람의 검수와 큐레이션을 거친 뒤 공개/색인해야 한다.

## 이번 PR에 적용한 것

### 1. 정책 페이지 품질 게이트

추가 파일: `lib/policy-quality.ts`

색인 가능 조건:

- 본문/요약/FAQ 포함 총 텍스트 900자 이상
- 지원 대상 또는 신청 방법 중 하나 이상 충분히 작성
- 요약 또는 본문 설명 존재
- 공식 출처 URL 존재
- 분류 정보 존재
- 총 7개 품질 항목 중 5개 이상 충족

적용 위치:

- 정책 상세 메타데이터: 기준 미달이면 `noindex, follow`
- 정책 sitemap: 기준 미달 정책은 `/sitemap-policies-N.xml`에서 제외

### 2. 출처 및 검수 정보 표시

추가 파일: `components/policy/PolicySourceNotice.tsx`

정책 상세 페이지에 아래 신뢰 신호를 표시한다.

- 마지막 확인일
- 공식 안내/신청 URL
- 콘텐츠 상태: 색인 가능 또는 검수 보강 대상
- 민간 정보 서비스이며 최종 확인은 공식 안내가 기준이라는 면책 문구

### 3. sitemap 정리

변경 파일: `app/sitemap-static.xml/route.ts`

유지:

- `/`
- `/welfare/categories`
- `/about`
- `/contact`
- `/editorial-policy`
- `/terms`
- `/privacy`
- `/marketing`

제외:

- `/welfare/search`: 검색 결과/필터 화면
- `/recommend`: 사용자 조건 입력 도구
- `/mypage`: 계정 화면
- `/more`: 내비게이션 화면

### 4. noindex 정리

noindex 처리:

- `/welfare/search`
- `/recommend`
- `/more`
- `/mypage`
- `/notifications`
- `/account/notifications`

의도:

- AdSense가 콘텐츠 페이지가 아닌 화면을 저가치 페이지로 판단할 가능성을 줄인다.

### 5. 신뢰 페이지 강화

추가 페이지:

- `/editorial-policy`

포함 내용:

- 정보 출처
- 발행 기준
- 업데이트/검수 방식
- 자동화 활용 범위
- 오류 제보와 정정 요청 방법

푸터에서 `/editorial-policy`, `/terms`, `/privacy`, `/marketing`을 모두 접근 가능하게 했다.

### 6. 광고 안전 모드

변경 파일:

- `app/layout.tsx`
- `components/ads/AdSlot.tsx`
- `.env.example`

운영 방식:

- `NEXT_PUBLIC_ADSENSE_CLIENT`가 있으면 AdSense 사이트 연결용 스크립트는 로드한다.
- `NEXT_PUBLIC_ADSENSE_UNITS_ENABLED=0`이면 광고 단위는 렌더링하지 않는다.
- 승인 전에는 `0` 유지, 승인 후 실제 광고 배치가 준비되면 `1`로 전환한다.

## 콘텐츠 보강 기준

재심사 전 색인할 대표 정책 30개는 아래 기준으로 보강한다.

- 900-1,500자 이상의 자체 설명
- 지원 대상: 나이, 소득, 거주지, 가구, 예외 조건
- 지원 내용: 금액, 지급 방식, 한도, 지급 주기
- 신청 기간: 상시/마감일/예상 접수 시기
- 신청 방법: 온라인, 방문, 필요 인증, 접수처
- 필요 서류: 기본 서류와 상황별 추가 서류
- 주의사항: 중복 신청, 소득 기준 오해, 지역 제한, 예산 소진
- FAQ 3개 이상
- 공식 출처 URL과 마지막 확인일
- 관련 정책 3개 내부 링크

## 재심사 순서

1. 위 품질 기준을 만족하는 정책 30개를 먼저 보강한다.
2. 기준 미달 정책은 `DRAFT`/`REVIEW`로 돌리거나 품질 게이트가 noindex 처리하게 둔다.
3. Vercel 환경변수에서 `NEXT_PUBLIC_SITE_URL=https://www.govmate.co.kr` 확인.
4. `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-...` 설정.
5. 승인 전 `NEXT_PUBLIC_ADSENSE_UNITS_ENABLED=0` 유지.
6. 배포 후 `/sitemap.xml`, `/sitemap-static.xml`, `/sitemap-policies-1.xml` 확인.
7. Search Console에서 sitemap 재제출.
8. 보강 페이지가 Google에 일부 반영된 뒤 7-14일 안정화.
9. AdSense 재심사 요청.

## 승인 후 작업

- 첫 광고 배치는 본문을 밀어내지 않는 위치에만 추가한다.
- 로그인, 검색 결과, 알림, 마이페이지에는 광고를 넣지 않는다.
- 정책 상세의 첫 화면에는 광고보다 본문 요약과 출처가 먼저 보이게 유지한다.
- `NEXT_PUBLIC_ADSENSE_UNITS_ENABLED=1` 전환은 광고 위치 QA 후 진행한다.
