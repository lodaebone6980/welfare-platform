# 시작 가이드 — 이 파일을 제일 먼저 읽으세요

## 파일 목록

| 파일 | 역할 |
|---|---|
| CLAUDE.md | Claude Code 전체 컨텍스트 — 항상 프로젝트 루트에 |
| COMMANDS.md | Phase별 Claude Code 명령어 모음 |
| package.json | npm 패키지 목록 |
| prisma/schema.prisma | DB 스키마 전체 |
| .env.example | 환경변수 템플릿 |
| .github/workflows/daily-automation.yml | 자동화 스케줄 |
| config/niche.ts | 니치별 설정 (정책자금 → 여행 등 확장용) |
| crawler/ | Python 크롤러 (config·db·fetcher·rewriter·publisher·image_gen·main) |
| lib/ | TypeScript 유틸 (prisma·rl-engine·threads-generator·threads-publisher·seo) |
| scripts/ | 자동화 스크립트 (threads-post·update-verdicts) |
| components/ | React 컴포넌트 (RichEditor·ImageUpload·SeoPanel·Sidebar) |
| app/(admin)/ | 어드민 (layout·dashboard·threads 관리) |
| app/(public)/ | 공개 사이트 (정책 상세 페이지) |
| app/api/ | API Routes (upload·policies·threads/publish) |
| app/sitemap.ts | 사이트맵 자동 생성 |
| next.config.ts | 301 리다이렉트 (WP → Next.js 이전) |
| mobile/App.tsx | React Native 웹뷰 앱 |
| public/ads.txt | AdSense 필수 파일 |

---

## 1단계 — 프로젝트 생성 (터미널)

```bash
npx create-next-app@latest welfare-platform \
  --typescript --tailwind --app --src-dir

cd welfare-platform

# 이 폴더의 모든 파일을 welfare-platform/ 안에 복사
# (package.json, CLAUDE.md, prisma/, crawler/ 등 전부)

npm install
npx prisma init --datasource-provider postgresql
```

---

## 2단계 — 환경변수 설정

```bash
cp .env.example .env.local
# .env.local 열어서 값 채우기
# 최소한 DATABASE_URL, OPENAI_API_KEY 는 있어야 시작 가능
```

---

## 3단계 — DB 마이그레이션

```bash
# Railway에서 PostgreSQL 생성 후 DATABASE_URL 복사
npx prisma migrate dev --name init
npx prisma generate
```

---

## 4단계 — Claude Code 시작

```bash
# Claude Code 설치
npm install -g @anthropic-ai/claude-code

# 프로젝트 폴더에서 실행
claude
```

Claude Code에 첫 번째 입력:
```
CLAUDE.md를 읽고 아직 없는 파일들을 이어서 만들어줘.
우선순위:
1. app/(admin)/marketing/threads-analytics/page.tsx
2. app/(admin)/marketing/google-ads/page.tsx  
3. app/(admin)/marketing/naver-blog/page.tsx
4. app/(admin)/content/policy/page.tsx
5. app/(admin)/content/policy/[id]/page.tsx (TipTap 에디터 연결)
6. app/(public)/welfare/[region]/page.tsx (GEO 랜딩)
7. app/wp-redirect/[id]/page.tsx (WP URL 이전)
```

---

## 5단계 — 크롤러 실행 (Python)

```bash
cd crawler
pip install -r requirements.txt

# 즉시 테스트 실행
python main.py
```

---

## 6단계 — Vercel 배포

```bash
npx vercel --prod

# 환경변수 설정
vercel env add DATABASE_URL production
vercel env add OPENAI_API_KEY production
# ... 나머지 환경변수

# Railway DB URL도 위에서 설정
```

---

## 7단계 — GitHub Actions 설정

GitHub 레포 → Settings → Secrets에 추가:
- OPENAI_API_KEY
- DATABASE_URL
- THREADS_ACCESS_TOKEN
- THREADS_USER_ID
- WP_URL / WP_USER / WP_APP_PASSWORD
- GOOGLE_ADS_* (광고 에이전트용)

---

## AdSense 심사 신청 타이밍

- 크롤러로 글 50개 이상 생성 후
- 사이트 운영 3주 이상 후
- ads.txt 배포 확인 후
- Google AdSense → 사이트 추가 → 심사 신청

---

## 니치 확장

1. `config/niche.ts`에서 `CURRENT_NICHE` 변경
2. 새 Vercel 프로젝트 생성
3. 같은 Railway DB or 새 DB 연결
4. 도메인 연결
