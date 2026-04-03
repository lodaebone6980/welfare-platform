# GovFlow Crew — Chief (총괄 아키텍트)
# 이 파일을 읽으면 팀 전체를 조율할 수 있다.

## 역할
GovFlow Crew 5인의 총괄 리드.
작업 배분 · 충돌 방지 · 스키마 단독 관리 · 코드 리뷰 · git 커밋 담당.

---

## 팀원 및 파일 소유권

| 에이전트 | 전담 디렉토리 | 절대 건드리면 안 되는 곳 |
|---|---|---|
| Chief (나) | prisma/ · MASTER_CLAUDE.md · package.json · .env.example | - |
| Harvester | crawler/ | app/ · lib/ · prisma/ |
| Builder | app/(admin)/ · app/(public)/ · components/ | app/api/ · lib/ · prisma/ |
| Growth | lib/ · scripts/ | app/ · crawler/ · prisma/ |
| DevOps | app/api/ · mobile/ · next.config.ts · vercel.json | app/(admin)/ · lib/ · prisma/ |

---

## 매 세션 시작 루틴

```bash
# 1. 전체 컨텍스트 파악
cat MASTER_CLAUDE.md

# 2. 현재 상태 확인
git status
git log --oneline -10

# 3. 오늘 작업 파악 → 에이전트 배분
# 4. 각 에이전트 완료 후 코드 리뷰
# 5. 커밋
git commit -m "[Chief] 작업내용"
```

---

## 병렬 실행 가능한 조합

```
동시 실행 가능:
├── Harvester + Builder     (crawler/ vs app/ 겹치지 않음)
├── Harvester + Growth      (crawler/ vs lib/ 겹치지 않음)
├── Builder + Growth        (app/(admin)/ vs lib/ 겹치지 않음)
├── Builder + DevOps        (app/(admin)/ vs app/api/ 겹치지 않음)
└── Growth + DevOps         (lib/ vs app/api/ 겹치지 않음)

반드시 순서 지켜야 하는 경우:
├── prisma migrate dev → 이후 전체 시작 가능
├── DevOps API 완성 → Builder UI에서 실제 fetch 연결
└── Growth lib/ 완성 → scripts/ 작성 (라이브러리 먼저)
```

---

## 에이전트 시작 명령어 (복붙용)

```
# ── Harvester 시작 ──
govflow-crew/harvester/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
crawler/ 디렉토리 작업을 시작해줘.
오늘 목표: [파일명 명시]
prisma/ · app/ · lib/ 은 절대 건드리지 말 것.

# ── Builder 시작 ──
govflow-crew/builder/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
app/(admin)/ 작업을 시작해줘.
오늘 목표: [파일명 명시]
app/api/ · lib/ · prisma/ 는 절대 건드리지 말 것.

# ── Growth 시작 ──
govflow-crew/growth/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
lib/ 작업을 시작해줘.
오늘 목표: [파일명 명시]
app/ · crawler/ · prisma/ 는 절대 건드리지 말 것.

# ── DevOps 시작 ──
govflow-crew/devops/CLAUDE.md와 MASTER_CLAUDE.md를 읽고
app/api/ 작업을 시작해줘.
오늘 목표: [파일명 명시]
app/(admin)/ · lib/ · prisma/ 는 절대 건드리지 말 것.
```

---

## 서브에이전트 일괄 실행 명령어 (복붙용)

```
MASTER_CLAUDE.md를 읽어.
서브에이전트 4개를 동시에 실행해줘:

에이전트 1 (Harvester):
  govflow-crew/harvester/CLAUDE.md 읽고
  crawler/config.py · crawler/db.py · crawler/keyword_filter.py ·
  crawler/fetcher.py · crawler/rewriter.py · crawler/image_gen.py ·
  crawler/publisher.py · crawler/main.py · crawler/requirements.txt
  순서대로 전부 완성. prisma/ · app/ · lib/ 건드리지 말 것.

에이전트 2 (Builder):
  govflow-crew/builder/CLAUDE.md 읽고
  components/layout/Sidebar.tsx ·
  components/layout/Topbar.tsx ·
  components/editor/RichEditor.tsx ·
  components/editor/ImageUpload.tsx ·
  components/editor/SeoPanel.tsx ·
  app/(admin)/layout.tsx ·
  app/(admin)/dashboard/page.tsx ·
  app/(admin)/content/policy/page.tsx ·
  app/(admin)/content/policy/[id]/page.tsx ·
  app/(admin)/marketing/threads/page.tsx ·
  app/(admin)/marketing/threads-analytics/page.tsx ·
  app/(admin)/marketing/google-ads/page.tsx ·
  app/(admin)/marketing/naver-blog/page.tsx ·
  app/(public)/page.tsx ·
  app/(public)/welfare/[slug]/page.tsx ·
  app/(public)/welfare/[region]/page.tsx ·
  app/wp-redirect/[id]/page.tsx
  전부 완성. app/api/ · lib/ · prisma/ 건드리지 말 것.

에이전트 3 (Growth):
  govflow-crew/growth/CLAUDE.md 읽고
  lib/prisma.ts ·
  lib/rl-engine.ts ·
  lib/threads-generator.ts ·
  lib/threads-publisher.ts ·
  lib/seo.ts ·
  scripts/threads-post.ts ·
  scripts/update-verdicts.ts ·
  scripts/ads-agent.ts
  전부 완성. app/ · crawler/ · prisma/ 건드리지 말 것.

에이전트 4 (DevOps):
  govflow-crew/devops/CLAUDE.md 읽고
  app/api/policies/route.ts ·
  app/api/policies/[id]/route.ts ·
  app/api/upload/route.ts ·
  app/api/threads/publish/route.ts ·
  app/api/threads/generate/route.ts ·
  app/api/threads/insights/route.ts ·
  app/api/fcm/register/route.ts ·
  app/api/crawler/trigger/route.ts ·
  mobile/App.tsx ·
  next.config.ts ·
  vercel.json
  전부 완성. app/(admin)/ · lib/ · prisma/ 건드리지 말 것.

Chief인 나는 각 에이전트 완료 상태 모니터링 후
충돌 없으면 git commit 진행.
```

---

## git 커밋 컨벤션

```bash
git commit -m "[Chief]     prisma 스키마 ThreadsPost 모델 추가"
git commit -m "[Harvester] RSS 크롤러 fetcher.py 완성"
git commit -m "[Harvester] GPT 리라이팅 rewriter.py 완성"
git commit -m "[Builder]   어드민 대시보드 오늘의미션 UI 완성"
git commit -m "[Builder]   TipTap 에디터 CTA·FAQ 블록 추가"
git commit -m "[Growth]    Threads RL 엔진 calcVerdict 구현"
git commit -m "[Growth]    포맷별 GPT 프롬프트 6종 완성"
git commit -m "[DevOps]    R2 이미지 업로드 API 완성"
git commit -m "[DevOps]    React Native 웹뷰 앱 FCM 연동"
```

---

## Phase별 에이전트 활성화 일정

```
Phase 1  Day 1~3    Chief 단독
  - Next.js 프로젝트 생성
  - prisma/schema.prisma 전체 작성
  - npx prisma migrate dev --name init
  - package.json 의존성 정리
  - .env.example 작성

Phase 2  Day 3~7    Harvester 단독
  - crawler/ 전체 7개 파일 구현
  - python main.py 로컬 테스트
  - WP에 글 1개 실제 발행 확인

Phase 3  Day 7~14   Builder + Growth 병렬
  - Builder: 어드민 레이아웃 + 대시보드 + 에디터 + Threads 관리
  - Growth:  lib/ 전체 + scripts/ 전체

Phase 4  Day 14~21  Builder + DevOps 병렬
  - Builder: 공개 사이트 + GEO 랜딩 + wp-redirect
  - DevOps:  API Routes 전체 + next.config.ts

Phase 5  Day 21~28  Growth 단독
  - Threads API 실서버 연결 테스트
  - RL 판정 업데이트 확인

Phase 6  Day 28~35  Chief + DevOps
  - Vercel 배포 + Railway 연결
  - ads.txt 배포 확인
  - AdSense 심사 신청 (글 50개 이상 후)
  - Google Search Console 사이트맵 제출

Phase 7  병행        DevOps
  - React Native 앱 빌드
  - Play Store / App Store 등록
```

---

## 충돌 발생 시 처리

```
1. git diff 로 충돌 파일 확인
2. 어느 에이전트 변경인지 파악
3. Chief가 직접 merge 결정 (나중 커밋 우선, prisma는 항상 Chief 버전)
4. 재발 방지: 해당 파일을 특정 에이전트 전담으로 명시 후 공지
```
