# 카카오 연동 가이드 (로그인 · 채널 친구추가 · 알림톡)

> 복지길잡이(govmate.co.kr)의 카카오 관련 기능을 단계별로 정리한 내부 운영 문서.
> 코드 변경 전/후에 체크리스트로 활용한다.

---

## 1. 현재 코드 상태 (2026-04 기준)

### 1-1. OAuth 로그인

- `lib/auth.ts` 에서 NextAuth 의 `KakaoProvider` 사용.
- **scope**: `profile_nickname profile_image account_email plusfriends`
  - `plusfriends` 는 "카카오톡 채널 추가 상태/메시지 수신 동의" 를 뜻한다. 이 동의를 받은 유저는 **우리 채널의 친구로 자동 등록되고**, 나중에 친구톡/알림톡 발송 대상이 될 수 있다.
- `signIn` 콜백에서 `role === 'BLOCKED'` 인 유저의 로그인을 거부.
- `events.signIn` 에서 `User.lastLoginAt` 갱신.

### 1-2. DB 스키마 변경 (2026-04)

`prisma/schema.prisma` 의 `User` 모델에 다음 필드가 추가됐다.

```prisma
lastLoginAt   DateTime?
blockedAt     DateTime?
blockedReason String?
```

인덱스: `createdAt desc`, `lastLoginAt`.

> **배포 전 필수**: 아래 "2. 배포 체크리스트" 의 Prisma 마이그레이션 스텝을 반드시 수행.

### 1-3. 관리자 기능

- `/members` — 회원 목록 + 통계 카드(가입 경로별/일자별 신규) + 탭(전체/카카오/구글/이메일/차단) + CSV 내보내기.
- `/members/[id]` — 회원 상세: 역할 변경, 차단, 탈퇴, 카카오 ID·scope 확인.
- `/api/admin/members` (GET, PATCH) — 목록/역할 변경
- `/api/admin/members/[id]` (GET, PATCH, DELETE) — 상세/수정/탈퇴
- `/api/admin/members/stats` (GET) — 통계
- `/api/admin/members/export` (GET) — CSV 다운로드

---

## 2. 배포 체크리스트

### 2-1. Prisma 마이그레이션

```bash
cd welfare-platform
# 로컬에서 스키마 변경 반영 (개발 DB)
npx prisma migrate dev -n add_user_block_and_lastlogin

# 또는 프로덕션에서 바로 적용할 때
npx prisma migrate deploy
```

> Supabase 를 쓰는 경우, `DIRECT_URL` 환경변수가 반드시 설정되어 있어야 `prisma migrate` 가 풀린다.
> pooler URL(6543) 로는 migrate 가 실패한다.

### 2-2. Vercel 환경변수

| 키 | 비고 |
|---|---|
| `KAKAO_CLIENT_ID` | REST API 키 (100% 필수) |
| `KAKAO_CLIENT_SECRET` | Kakao 콘솔 > 보안 탭에서 발급·활성화한 값 |
| `NEXTAUTH_SECRET` | JWT 서명 |
| `DATABASE_URL` | **Transaction Pooler (6543) + `?pgbouncer=true&connection_limit=1`** |
| `DIRECT_URL` | Direct connection (5432) — 마이그레이션용 |
| `ADMIN_EMAILS` | 관리자 이메일 (쉼표 구분) |

### 2-3. Vercel 리전

`vercel.json` 에 `"regions": ["icn1"]` (서울) 이 설정됨. Vercel 프로젝트 설정에서 실제로 icn1 이 적용됐는지 Functions 탭에서 확인.

---

## 3. 카카오 개발자 콘솔 설정

### 3-1. 비즈 앱 전환

- 콘솔 > 내 애플리케이션 > **비즈 앱 전환** 신청.
- 사업자등록증 업로드 → 심사 1~3영업일.
- 비즈 앱이어야 `plusfriends` 같은 확장 scope 가 실제로 동의 화면에 노출된다.

### 3-2. 카카오 로그인 동의항목

콘솔 > 내 애플리케이션 > **카카오 로그인 > 동의항목** 에서 아래 3개를 "선택 동의" 또는 "필수 동의" 로 설정한다.

- `profile_nickname` (닉네임)
- `profile_image` (프로필 사진)
- `account_email` (카카오계정 이메일)
- `plusfriends` (카카오톡 채널 추가 상태 및 내역) ← **이게 핵심**

> `friends` (친구 목록), `talk_message` (메시지 발송) 는 **2019년 이후 사실상 비공개**로 전환되어, 테스트 사용자 6명 이내에서만 발송 가능하다. 운영용으로는 쓰지 않는다.

### 3-3. 카카오싱크 & 비즈니스 채널

- 콘솔 > **카카오싱크 > 카카오톡 채널** 에서 우리 회사 채널(예: `@복지길잡이`) 을 연결.
- 설정 완료 후 로그인 동의 화면에 **"카카오톡 채널 추가 및 내역 수신 동의"** 체크박스가 나타난다.
- 유저가 체크하고 로그인하면 → 우리 채널의 친구로 즉시 자동 등록.

### 3-4. Redirect URI

- `https://govmate.co.kr/api/auth/callback/kakao`
- 로컬 테스트 시 `http://localhost:3000/api/auth/callback/kakao` 도 등록해두면 편함.

---

## 4. 실제 "채널 친구에게 메시지 발송"

카카오 표준 OAuth 만으로는 **불가능**. 비즈메시지 API 를 써야 하며, 직접 계약은 **파트너 계약 심사 + 사업자 조건** 이 까다로워 **리셀러** 경유가 일반적이다.

### 4-1. 리셀러 옵션

| 업체 | 장점 | 발송 단가(대략) | API 난이도 |
|---|---|---|---|
| NHN Cloud Notification | 안정적, 한국 1티어 | 알림톡 8~12원 / 친구톡 15원 | 중 |
| 알리고 (aligo.in) | 쉬운 콘솔, 개인 사업자도 가입 쉬움 | 알림톡 8~10원 / 친구톡 15원 | 하 |
| 스윗트래커 | 대량 전송 · 분석 기능 | 협의 | 중 |

### 4-2. 메시지 유형

- **알림톡**: "정보성" 메시지. 전화번호 기준 발송 (채널 친구 아니어도 가능). 템플릿 사전심사 1~3영업일. 광고성 내용 금지.
- **친구톡**: "광고성" 메시지. 우리 채널 친구에게만 발송. 카카오톡 내에서 클릭/버튼 사용 가능.

### 4-3. 플로우 (예시 · 알리고)

```
1. 카카오 비즈채널 생성 → 승인
2. 알리고에서 비즈채널 연결
3. 알림톡 템플릿 작성 → 카카오 심사
4. 템플릿 승인 후 → API Key 발급
5. 우리 서버에서 POST https://kakaoapi.aligo.in/akv10/alimtalk/send/
   body: senderkey, tpl_code, receiver_1, subject_1, message_1
```

### 4-4. 우리 쪽 설계 메모 (추후)

- `prisma/schema.prisma` 에 `MessageTemplate`, `MessageLog` 모델 추가
- `/api/admin/kakao/send` — 단건 발송 (테스트용)
- `/api/admin/kakao/send-batch` — 대량 발송
- Admin UI 는 `/marketing/kakao` 로 네이밍 예정

---

## 5. 현재 할 수 있는 것 / 못 하는 것

| 항목 | 가능? | 비고 |
|---|---|---|
| 카카오로 회원가입/로그인 | ✅ | 기본 기능 |
| 카카오 로그인 회원 목록 관리 | ✅ | `/members` 탭 "카카오" |
| 카카오 로그인 시 채널 자동 친구추가 | ⚠️ 조건부 | 비즈 앱 + plusfriends scope + 유저 동의 필수 |
| 채널 친구 목록 조회 API | ❌ | 카카오가 비공개 |
| 채널 친구에게 친구톡 발송 | ⚠️ | 리셀러 계약 + 광고성 심사 필요 |
| 전화번호로 알림톡 발송 | ⚠️ | 리셀러 계약 + 템플릿 심사 |
| 카카오 채널 운영 (댓글/DM) | ✅ | center-pf.kakao.com 웹에서 직접 |
| 오픈빌더 챗봇 | ✅ | 별도 개발. OAuth 와 무관 |

---

## 6. 체크리스트 (이 순서대로 수행)

### 단기 (코드만)

- [x] `KakaoProvider` scope 에 `plusfriends` 추가 (`lib/auth.ts`)
- [x] `User` 스키마에 `lastLoginAt`, `blockedAt`, `blockedReason` 추가
- [x] 회원관리 확장 (통계/탭/상세/CSV/차단/탈퇴)
- [x] 회원 상세에서 Kakao scope 확인 가능

### 중기 (카카오 콘솔)

- [ ] 비즈 앱 전환 신청
- [ ] 동의항목 > `plusfriends` 활성화
- [ ] 카카오톡 채널 생성 & 카카오싱크 연결
- [ ] 프로덕션 Redirect URI 확인

### 장기 (비즈메시지)

- [ ] 리셀러(알리고 또는 NHN Cloud) 가입
- [ ] 발신프로필(채널 키) 등록
- [ ] 알림톡 템플릿 5~10개 준비/심사
- [ ] `/api/admin/kakao/send*` 엔드포인트 구축
- [ ] `/marketing/kakao` 관리 UI 구축

---

## 7. 참고 링크

- NextAuth Kakao Provider: https://next-auth.js.org/providers/kakao
- 카카오 로그인 scope 목록: https://developers.kakao.com/docs/latest/ko/kakaologin/common
- 카카오싱크 안내: https://business.kakao.com/sync
- 카카오 비즈메시지 소개: https://business.kakao.com/bizmessage
- 알리고 알림톡 API: https://smartsms.aligo.in/admin/api/info.html
- NHN Cloud Notification: https://www.nhncloud.com/kr/service/notification/kakaotalk-bizmessage
