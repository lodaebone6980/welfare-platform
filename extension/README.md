# GovMate Indexer (Chrome 확장)

지원금길잡이(govmate.co.kr) 의 새 정책 URL 을 **네이버 검색어드바이저** 와 **다음 페이지등록** 에
자동으로 제출하는 보조 도구입니다. 두 검색엔진 모두 공식 색인 API 가 없어서
사람이 직접 클릭해야 하는데, 이 확장이 그 클릭을 대신 해줍니다.

> Bing/Yandex 는 IndexNow API, Google 은 Google Indexing API 가 따로 처리합니다.
> 이 확장은 **네이버 + 다음만** 담당합니다.

---

## 동작 흐름

```
admin enqueue / publish hook
      │
      ▼
PostgreSQL: indexing_queue (PENDING)
      │
      ▼
[Chrome 확장] background.js (5분 alarm)
      │  GET /api/indexing-queue/pull?engine=NAVER_MANUAL&limit=3
      ▼
NAVER 검색어드바이저 / DAUM 페이지등록 탭
      │  content script 가 URL 입력 → 제출 클릭
      ▼
POST /api/indexing-queue/result   (SUCCESS / FAILED / CAPTCHA)
      │
      ▼
indexing_queue 갱신 + indexing_log 1건 누적
```

## 설치

1. 서버 `.env` 에 시크릿이 들어 있어야 합니다.

   ```dotenv
   INDEXING_QUEUE_SECRET="긴_랜덤_문자열"
   NEXT_PUBLIC_SITE_URL="https://www.govmate.co.kr"
   ```

2. `chrome://extensions` 접속 → **개발자 모드 ON** → **압축해제된 확장 프로그램을 로드** →
   이 `extension/` 폴더 선택.

3. 확장 아이콘 우클릭 → **옵션** → 다음 입력 후 **저장**:

   - 서버 URL: `https://www.govmate.co.kr`
   - INDEXING_QUEUE_SECRET: `.env` 와 동일 값
   - 자동 풀링 활성: 체크

4. 같은 브라우저에서 다음 사이트에 **미리 로그인**해 둡니다.

   - <https://searchadvisor.naver.com/console/board>
     (사이트 목록에서 `govmate.co.kr` 을 한번 선택해 두세요)
   - <https://register.search.daum.net/index.daum>

5. 5 분 뒤 자동 시작. 즉시 테스트하려면 팝업의 **지금 1회 실행** 버튼 클릭.

## 어드민에서 큐 관리

- 페이지: <https://www.govmate.co.kr/admin/indexing/queue>
- 자동 등록: 최근 N시간 발행/갱신 정책을 한 번에 큐에 넣음
- 수동 등록: URL 을 한 줄에 하나씩 붙여넣기 → 큐 등록
- 상태/엔진 필터, URL 검색, 15초 자동 갱신

## 스크립트로 한 번에 시드

```bash
# 전체 PUBLISHED 정책을 큐에 넣기
npx tsx scripts/seed-indexing-queue.ts

# 최근 24시간만
HOURS=24 npx tsx scripts/seed-indexing-queue.ts

# 네이버만
ENGINES=NAVER_MANUAL npx tsx scripts/seed-indexing-queue.ts
```

## 일일 한도

서버에서 강제하는 보수적 기본값:

| 엔진          | 일일 한도 |
| ------------- | --------- |
| NAVER_MANUAL  | 50        |
| DAUM_MANUAL   | 30        |

> 한도에 도달하면 `pull` 이 빈 배열을 반환하고 `reason: daily-limit-reached` 로 응답합니다.
> 한도는 `app/api/indexing-queue/pull/route.ts` 의 `DAILY_LIMITS` 상수에서 조정 가능합니다.

## 캡차

- 캡차가 감지되면 status = `CAPTCHA` 로 기록되고 자동 처리는 중단됩니다.
- 사용자가 해당 탭에서 직접 캡차를 풀면, 다음 풀링 사이클에서 같은 URL 이
  다시 잡히지는 않습니다(상태가 종료라 enqueue 화면에서 재요청해야 함).

## 보안

- 서버 ↔ 확장 통신은 `x-indexing-secret` 헤더 1개로 인증합니다.
- 확장은 시크릿을 `chrome.storage.sync` 에 저장합니다. 시크릿이 노출되면
  `.env` 와 옵션 양쪽 값을 새로 갈아끼우면 됩니다.
- `/api/indexing-queue/*` 는 NextAuth 가 아닌 시크릿 검증만 수행하므로
  반드시 강력한 무작위 값을 사용하세요.
