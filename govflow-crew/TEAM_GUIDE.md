# GovFlow Crew — 팀 운영 완전 가이드

## 팀 이름: GovFlow Crew

정부(Gov) 정책 자동화 플로우(Flow) + Crew(팀).
정부 지원금 플랫폼을 자동화하는 Claude Code 서브에이전트 팀.

---

## 팀원 구성 (5인)

| 코드명 | 역할 | 담당 디렉토리 | CLAUDE.md 위치 |
|---|---|---|---|
| Chief | 총괄 아키텍트 | prisma/ · package.json · 루트 | govflow-crew/chief/CLAUDE.md |
| Harvester | 크롤러팀 | crawler/ | govflow-crew/harvester/CLAUDE.md |
| Builder | 프론트팀 | app/(admin)/ · app/(public)/ · components/ | govflow-crew/builder/CLAUDE.md |
| Growth | 그로스팀 | lib/ · scripts/ | govflow-crew/growth/CLAUDE.md |
| DevOps | 인프라팀 | app/api/ · mobile/ · next.config.ts | govflow-crew/devops/CLAUDE.md |

---

## 파일 소유권 지도 (충돌 방지 핵심)

```
welfare-platform/
│
├── MASTER_CLAUDE.md          ← CHIEF 전용
├── package.json              ← CHIEF 전용
├── prisma/schema.prisma      ← CHIEF 전용 (절대 다른 에이전트 수정 금지)
│
├── crawler/                  ← HARVESTER 전용
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
├── components/               ← BUILDER 전용
├── app/(admin)/              ← BUILDER 전용
├── app/(public)/             ← BUILDER 전용
├── app/wp-redirect/          ← BUILDER 전용
├── app/login/                ← BUILDER 전용
│
├── lib/                      ← GROWTH 전용
│   ├── prisma.ts
│   ├── rl-engine.ts
│   ├── threads-generator.ts
│   ├── threads-publisher.ts
│   └── seo.ts
├── scripts/                  ← GROWTH 전용
│   ├── threads-post.ts
│   ├── update-verdicts.ts
│   └── ads-agent.ts
│
├── app/api/                  ← DEVOPS 전용
├── app/sitemap.ts            ← DEVOPS 전용
├── mobile/                   ← DEVOPS 전용
├── next.config.ts            ← DEVOPS 전용
├── vercel.json               ← DEVOPS 전용
└── public/ads.txt            ← DEVOPS 전용
```

---

## Claude Code에서 팀 운영하는 방법

### 방법 A — 터미널 탭 5개 분리 (추천)

```bash
# 탭 1: Chief
cd welfare-platform && claude
> govflow-crew/chief/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
> GovFlow Crew Chief로서 오늘 작업을 배분해줘.

# 탭 2: Harvester
cd welfare-platform && claude
> govflow-crew/harvester/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
> crawler/ 전체를 완성해줘.

# 탭 3: Builder
cd welfare-platform && claude
> govflow-crew/builder/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
> app/(admin)/ 작업을 시작해줘.

# 탭 4: Growth
cd welfare-platform && claude
> govflow-crew/growth/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
> lib/ 전체를 완성해줘.

# 탭 5: DevOps
cd welfare-platform && claude
> govflow-crew/devops/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
> app/api/ 전체를 완성해줘.
```

### 방법 B — Chief 세션에서 서브에이전트 일괄 실행

```
govflow-crew/chief/CLAUDE.md와 MASTER_CLAUDE.md를 읽어.
GovFlow Crew Chief로서 서브에이전트 4개를 동시에 실행해줘.

에이전트 1 (Harvester):
  govflow-crew/harvester/CLAUDE.md 읽고
  crawler/ 디렉토리 7개 파일 전부 완성.
  완료 후 python main.py 테스트 실행.

에이전트 2 (Builder):
  govflow-crew/builder/CLAUDE.md 읽고
  components/ 전체 + app/(admin)/layout.tsx +
  app/(admin)/dashboard/page.tsx +
  app/(admin)/marketing/threads/page.tsx +
  app/(admin)/marketing/threads-analytics/page.tsx +
  app/(admin)/marketing/google-ads/page.tsx +
  app/(public)/welfare/[slug]/page.tsx +
  app/(public)/welfare/[region]/page.tsx 완성.

에이전트 3 (Growth):
  govflow-crew/growth/CLAUDE.md 읽고
  lib/ 5개 파일 + scripts/ 3개 파일 전부 완성.
  완료 후 npx tsx scripts/threads-post.ts 테스트.

에이전트 4 (DevOps):
  govflow-crew/devops/CLAUDE.md 읽고
  app/api/ 전체 + next.config.ts + mobile/App.tsx +
  public/ads.txt 완성.
  완료 후 vercel --prod 배포.

각 에이전트는 자기 담당 파일만 건드릴 것.
prisma/schema.prisma는 Chief만 수정함.
완료 보고 형식은 각 CLAUDE.md 마지막 섹션 참조.
```

---

## Phase별 팀 활성화 일정

```
Phase 1  Day 1~3    Chief 단독
  npx create-next-app welfare-platform --typescript --tailwind --app
  prisma/schema.prisma 전체 작성
  npx prisma migrate dev --name init
  package.json 의존성 정리
  .env.example 작성
  govflow-crew/ 폴더를 프로젝트 루트에 복사

Phase 2  Day 3~7    Harvester 단독
  crawler/ 전체 구현
  python main.py 로컬 테스트
  WP에 글 1개 실제 발행 확인

Phase 3  Day 7~14   Builder + Growth 병렬
  Builder: 어드민 레이아웃 + 대시보드 + 에디터 + Threads 관리
  Growth:  lib/ 전체 + scripts/ 전체

Phase 4  Day 14~21  Builder + DevOps 병렬
  Builder: 공개 사이트 + GEO 랜딩 + wp-redirect
  DevOps:  API Routes 전체 + next.config.ts

Phase 5  Day 21~28  Growth 단독
  Threads API 실서버 연결 테스트
  RL 판정 업데이트 확인
  광고 에이전트 테스트

Phase 6  Day 28~35  Chief + DevOps
  Vercel 배포 + Railway 연결
  ads.txt 배포 확인
  AdSense 심사 신청 (글 50개 이상 후)
  Google Search Console 사이트맵 제출

Phase 7  병행        DevOps
  React Native 앱 빌드
  Play Store / App Store 등록 (심사 1~2주)
```

---

## git 커밋 컨벤션

```bash
git commit -m "[Chief]     prisma Policy 모델 geoDistrict 필드 추가"
git commit -m "[Harvester] fetcher.py RSS 6개 소스 구현 완료"
git commit -m "[Harvester] rewriter.py GPT-4o-mini 리라이팅 완료"
git commit -m "[Builder]   Sidebar.tsx 전체 메뉴 active 상태 구현"
git commit -m "[Builder]   어드민 대시보드 오늘의미션 + 스트릭 완성"
git commit -m "[Builder]   TipTap RichEditor CTA·FAQ 블록 삽입 완성"
git commit -m "[Growth]    rl-engine.ts calcVerdict·DEFAULT_STATS 구현"
git commit -m "[Growth]    threads-generator.ts 포맷 6종 프롬프트 완성"
git commit -m "[Growth]    threads-post.ts 자동 발행 스크립트 완성"
git commit -m "[DevOps]    upload/route.ts Cloudflare R2 연동 완성"
git commit -m "[DevOps]    threads/publish/route.ts API 완성"
git commit -m "[DevOps]    mobile/App.tsx FCM + AdSense 숨김 구현"
git commit -m "[DevOps]    vercel --prod 배포 완료"
```

---

## 에이전트 간 커뮤니케이션 규칙

### 완료 보고 형식 (Chief에게)
```
[에이전트명] 완료 보고
- 완성된 파일: [목록]
- 테스트 결과: [통과/실패 내용]
- 다음 에이전트에게 전달: [있으면 작성]
- 블로킹 이슈: [있으면 작성, 없으면 "없음"]
```

### 블로킹 처리 원칙
```
Growth lib/ 완성 전에 Builder가 import 필요한 경우:
→ Builder는 타입만 inline으로 정의하고 UI 먼저 완성
→ Growth 완료 후 Chief가 import로 교체 지시

DevOps API 완성 전에 Builder가 fetch 필요한 경우:
→ Builder는 mock 데이터로 UI 먼저 완성
→ DevOps 완료 후 Builder가 실제 fetch로 교체
```

---

## 충돌 방지 규칙 전체

```
1. 에이전트는 자기 담당 디렉토리 밖 파일 수정 금지
2. prisma/schema.prisma 변경 → Chief에게 요청
3. 새 npm 패키지 추가 → Chief에게 package.json 수정 요청
4. 환경변수 추가 → .env.example에 먼저 명시 후 Chief에게 보고
5. 같은 파일 동시 수정 감지 시 즉시 중단 후 Chief에게 보고
```

---

## 최종 배포 체크리스트 (Chief 담당)

```
인프라
□ Railway PostgreSQL 생성 + DATABASE_URL 복사
□ npx prisma migrate deploy 완료
□ Vercel 환경변수 전체 설정 (15개)
□ Cloudflare DNS A레코드 → Vercel IP
□ SSL 인증서 자동 발급 확인

SEO
□ public/ads.txt 배포 확인 (yourdomain.com/ads.txt 접근)
□ /sitemap.xml 접근 확인
□ robots.txt 설정 (필요 시)
□ Google Search Console 사이트맵 제출

콘텐츠
□ 크롤러로 글 50개 이상 생성 확인
□ 사이트 3주 이상 운영 (AdSense 심사 조건)

AdSense
□ AdSense 심사 신청 (위 두 조건 충족 후)
□ 승인 후 ADSENSE_PUB_ID 환경변수 교체
□ ads.txt pub 코드 교체
□ Auto Ads + 수동 슬롯 3개 활성화 확인

자동화
□ GitHub Actions Secrets 설정 전체
□ daily-automation.yml 크론 스케줄 확인
□ Threads 자동 발행 테스트 (1개 발행 확인)
□ 광고 에이전트 첫 실행 확인

앱
□ React Native 빌드 성공
□ FCM 푸시 수신 테스트
□ AdSense 숨김 (app_mode 쿠키) 동작 확인
□ Play Store 등록 (심사 3~7일)
□ App Store 등록 (심사 1~2주)
```

---

## 자주 쓰는 명령어 모음

```bash
# 개발 서버
npm run dev

# DB 관련
npx prisma migrate dev --name 변경내용
npx prisma studio                    # DB GUI
npx prisma migrate deploy            # 프로덕션 적용

# 스크립트 실행
npx tsx scripts/threads-post.ts
npx tsx scripts/update-verdicts.ts
npx tsx scripts/ads-agent.ts

# 크롤러
cd crawler && python main.py

# 배포
vercel --prod
vercel logs                          # 배포 로그 확인

# 타입 체크
npx tsc --noEmit

# git
git status
git log --oneline -10
git commit -m "[팀명] 작업내용"
```
