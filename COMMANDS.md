# Claude Code 시작 명령어 모음
# 이 파일을 순서대로 Claude Code에 붙여넣으면 된다

# ============================================================
# PHASE 1 — 프로젝트 세팅 (Day 1~3)
# ============================================================

## Step 1-1: 프로젝트 생성 (터미널에서 직접 실행)
```bash
npx create-next-app@latest welfare-platform \
  --typescript --tailwind --app --src-dir
cd welfare-platform
cp ~/Downloads/CLAUDE.md .
```

## Step 1-2: 패키지 설치 (터미널에서 직접 실행)
```bash
npm install prisma @prisma/client next-auth \
  @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-image @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/extension-table \
  @tiptap/extension-table-row @tiptap/extension-table-cell \
  @tiptap/extension-table-header \
  openai recharts @tanstack/react-query \
  @aws-sdk/client-s3 nanoid \
  @react-native-firebase/app @react-native-firebase/messaging

npx prisma init --datasource-provider postgresql
```

## Step 1-3: Claude Code에 입력할 첫 번째 명령
```
CLAUDE.md를 읽고 prisma/schema.prisma를 작성해줘.
Policy, ThreadsPost, Category, Faq, ApiSource, 
UrlMapping, SocialPost, FcmToken 모델 전부 포함.
작성 후 npx prisma generate 실행해줘.
```

# ============================================================
# PHASE 2 — 크롤러 (Day 3~7)
# ============================================================

## Step 2-1
```
crawler/ 디렉토리에 아래 파일들을 만들어줘:
config.py, db.py, keyword_filter.py, 
fetcher.py, rewriter.py, image_gen.py, 
publisher.py, main.py

CLAUDE.md의 RSS 소스와 키워드 목록 그대로 사용.
GPT 리라이팅은 정책자금 전용 프롬프트로.
중복방지는 SQLite crawler.db 사용.
포스팅은 WP REST API (Basic Auth).
```

## Step 2-2
```
.github/workflows/daily-automation.yml 만들어줘.
4개 잡 포함:
1. content-pipeline: 매일 오전 11시 크롤러 실행
2. threads-auto-post: 매일 오전 9시·오후 7시 발행
3. ads-agent: 매일 오전 2시 광고 최적화
4. verdict-update: 매일 자정 성과 수집
```

# ============================================================
# PHASE 3 — 어드민 UI (Day 7~14)
# ============================================================

## Step 3-1: 레이아웃
```
app/(admin)/layout.tsx 만들어줘.
왼쪽 사이드바 + 상단 탑바 구조.
사이드바 메뉴:
- 대시보드
- 콘텐츠 > 정책관리, 대량생성, 카테고리
- 데이터 > API수집현황, 유입분석, 검색트렌딩
- 마케팅·광고 > 구글광고에이전트, Meta광고, 네이버광고
- SNS관리 > Threads관리, Threads성과, 인스타, 틱톡, N블로그
NextAuth 세션 확인해서 미인증 시 /login으로 redirect.
```

## Step 3-2: 대시보드
```
app/(admin)/dashboard/page.tsx 만들어줘.
포함할 것:
1. 오늘의 미션 카드 (발행목표 3건, 프로그레스바)
2. 발행 스트릭 카드 (연속 발행일)
3. 메트릭 카드 4개 (오늘방문자, AdSense수익, Threads REWARD율, 앱DAU)
4. 최근 수집 정책 테이블
5. RL 학습 요약 (포맷별 평균 성과)
6. 트래픽 채널 분포 (진행바)
DB에서 실제 데이터 읽어오는 방식으로.
```

## Step 3-3: TipTap 에디터
```
components/editor/RichEditor.tsx 만들어줘.
툴바 버튼: B I H2 H3 링크 이미지업로드 표 목록 CTA버튼 FAQ블록
버블메뉴: 텍스트 선택 시 플로팅 B I 링크
CTA버튼 삽입: <a href="" class="cta-button">지금 신청하기 →</a>
FAQ블록 삽입: <details><summary>Q.</summary><p>A.</p></details>

components/editor/ImageUpload.tsx:
파일 선택 → /api/upload POST → R2 저장 → URL 반환 → 에디터에 삽입

components/editor/SeoPanel.tsx:
- 포커스 키워드 입력
- GEO 타겟 지역 태그 선택 (서울·경기·부산 등)
- canonical URL
- 메타 디스크립션
- 발행 상태 (DRAFT·REVIEW·PUBLISHED)
- SNS 자동공유 토글
- FCM 푸시발송 토글
- 구글 색인요청 토글
```

## Step 3-4: Threads 관리
```
app/(admin)/marketing/threads/page.tsx 만들어줘.

상단 카드: 대기중·예약됨·총발행·오늘발행·잔여건수
연결 상태: @계정명 연결됨 표시

탭 3개:
1. 발행됨 탭: 정책명·콘텐츠미리보기·포맷배지·상태·REWARD판정·발행일 테이블
2. 대기중 탭: 예약발행 목록
3. 생성하기 탭:
   - 정책 선택
   - 포맷 선택 (checklist·qa·story·number·compilation·cardnews)
   - AI 자동생성 버튼 → GPT 호출
   - 미리보기/수정 모달 (500자 카운터)
   - 저장·저장&발행·닫기 버튼

포맷 배지 색상:
checklist=초록, qa=파랑, story=주황, 
number=빨강, compilation=보라, cardnews=핑크
REWARD=초록, PUNISHMENT=빨강, NEUTRAL=회색
```

## Step 3-5: Threads 성과분석
```
app/(admin)/marketing/threads-analytics/page.tsx 만들어줘.

메트릭 카드: 총발행·평균조회·평균참여율·REWARD율(7일)
포맷별 성과 바차트 (recharts)
Persona DNA 박스 (JSON 형태 표시)
최근 포스트 성과 테이블: 콘텐츠·포맷·조회·좋아요·댓글·참여율·판정
```

## Step 3-6: 구글광고 에이전트
```
app/(admin)/marketing/google-ads/page.tsx 만들어줘.

에이전트 상태 박스:
- 건강점수 링 (0~100점)
- 활성화됨/비활성화 토글
- 수동실행 버튼
- 주기·마지막실행·다음실행 표시

탭: 대시보드·에이전트·광고관리·키워드등록·전환추적

대시보드 탭:
- 키워드수·키워드추가·비활성화 카드
- 노출수·클릭수·총비용·평균CPC 카드
- 일별 추이 라인차트 (노출·클릭·비용)
- 광고그룹별 현황 테이블

일일 리포트:
날짜 탭 선택 → 해당 날 리포트 표시
```

# ============================================================
# PHASE 4 — 공개 사이트 + SEO (Day 14~21)
# ============================================================

## Step 4-1
```
lib/seo.ts 만들어줘.
buildMetaTags 함수:
- geo.region 메타태그 (ISO 3166-2:KR 형식)
- FAQPage JSON-LD 스키마
- Article JSON-LD 스키마
- OpenGraph (ko_KR locale)
- canonical URL

지역코드 매핑: 서울→11, 경기→41, 부산→26 등 17개 전체
```

## Step 4-2
```
app/(public)/welfare/[slug]/page.tsx 만들어줘.
generateStaticParams로 빌드타임 정적 생성.
ISR revalidate: 3600 (1시간).

페이지 구조:
1. 히어로: 지원금액 크게 + 신청버튼 CTA (파란색)
2. 지원대상 체크리스트
3. 신청방법 스텝 (1→2→3)
4. FAQ 아코디언 (FAQPage 스키마)
5. AdSense 슬롯 3개 (상단·중간·하단)
6. 관련 정책 카드 3개 (내부링크)
JSON-LD 스크립트 태그 head에 삽입.
```

## Step 4-3
```
app/(public)/welfare/[region]/page.tsx 만들어줘.
17개 시도 GEO 랜딩 페이지.
해당 지역 정책만 필터링해서 카드로 표시.
geo.region 메타태그 자동 삽입.
신청 마감 D-day 카운터.

app/sitemap.ts:
모든 PUBLISHED 정책을 포함한 사이트맵 자동 생성.
changeFrequency weekly, priority 0.8.
```

## Step 4-4
```
next.config.ts에 redirects 추가해줘.
WP URL 패턴 → Next.js URL 301 리다이렉트:
- /?p=[id] → /wp-redirect/[id]
- /category/[slug] → /welfare/category/[slug]
- /tag/[slug] → /welfare/tag/[slug]

app/wp-redirect/[id]/page.tsx:
UrlMapping 테이블에서 wpId로 newSlug 조회 → 308 redirect
```

# ============================================================
# PHASE 5 — Threads 자동화 (Day 21~28)
# ============================================================

## Step 5-1
```
lib/threads-generator.ts 만들어줘.
포맷별 GPT 프롬프트 6종 완전하게:

checklist: "✅ [조건]" 형식, 450자 이내
qa: "Q: [질문] 🤔 / A: [답변]" 형식
story: 공감 훅으로 시작, 감정이입 + 정보
number: 숫자 크게 강조, 구체적 금액 포함
compilation: 3~5개 묶음, "신청 안 하면 후회" 훅
cardnews: 핵심 한 줄 + 상세 링크

Persona DNA 적용:
- avg_chars 400, 문장마다 줄바꿈
- 캐주얼·정보성 톤
- 시그니처 문구 랜덤 삽입
```

## Step 5-2
```
lib/rl-engine.ts 만들어줘.
calcVerdict: views·likes·comments·shares로 REWARD/PUNISHMENT/NEUTRAL 판정
calcFormatStats: 포맷별 평균 성과 계산
recommendNextFormat: 상위 2개 포맷 랜덤 교대 추천
(한 포맷만 반복하면 알고리즘 페널티)
```

## Step 5-3
```
scripts/threads-post.ts 만들어줘.
1. rl-engine으로 오늘 추천 포맷 결정
2. 오늘 발행 안 된 정책 중 하나 선택
3. threads-generator로 GPT 생성
4. threads-publisher로 발행
5. DB에 ThreadsPost 저장

scripts/update-verdicts.ts:
발행된 ThreadsPost 전체 조회
Threads API insights 호출해서 views·likes·comments 업데이트
calcVerdict로 판정 업데이트
```

# ============================================================
# PHASE 6 — 배포 (Day 28~35)
# ============================================================

## Step 6-1
```
public/ads.txt 파일 만들어줘:
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0

(실제 pub 코드는 AdSense 승인 후 교체)
```

## Step 6-2 (터미널에서 직접)
```bash
# Vercel 배포
npx vercel --prod

# 환경변수 설정
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
# ... 나머지 환경변수들

# Railway DB 생성 후 DATABASE_URL 복사해서 위에 입력
```

# ============================================================
# PHASE 7 — React Native 앱 (병행)
# ============================================================

## Step 7-1
```
mobile/ 디렉토리에 React Native 웹뷰 앱 만들어줘.
App.tsx에:
- WebView로 welfare-platform URL 로드
- FCM 푸시 알림 설정 (토큰 서버 전송)
- 카카오 로그인 딥링크 처리
- 뒤로가기 버튼 처리
- 앱 내에서 AdSense 자동 숨김 (쿠키 감지)
- 상태바 설정

Android/iOS 빌드 설정 파일도 포함.
AdMob 배너는 앱 하단에 고정.
```

# ============================================================
# 니치 확장 (정책자금 완성 후)
# ============================================================

## 여행 버전으로 확장할 때
```
config/niche.ts를 여행 버전으로 수정하고
새 Vercel 프로젝트로 배포해줘.

RSS 소스: 투어비스·트립닷컴·에어비앤비 RSS
수익화: Booking.com 제휴 API (예약 성사 시 7~10% 수수료)
GPT 프롬프트: 여행 감성 위주
```
