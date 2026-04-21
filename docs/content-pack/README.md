# 고브메이트 콘텐츠 팩 (2026-04-21)

사이트 메뉴에서 **빈 상태**이거나 **플레이스홀더**였던 페이지를 일괄로 채울 수 있도록 준비한 콘텐츠 묶음입니다.

## 포함된 것 (총 24개 파일)

```
content-pack/
├── categories/            (카테고리 랜딩 소개문 x 10)
│   ├── refund.md                    환급금
│   ├── voucher.md                   바우처
│   ├── subsidy.md                   지원금
│   ├── loan.md                      대출
│   ├── grant.md                     보조금
│   ├── education.md                 교육
│   ├── housing.md                   주거
│   ├── medical.md                   의료
│   ├── employment.md                고용
│   ├── culture.md                   문화
│   └── pregnancy-childcare.md       임신·육아
│
├── static/                (정적 페이지 x 4)
│   ├── about.md                     /about       - 회사 소개
│   ├── terms.md                     /terms       - 이용약관
│   ├── privacy.md                   /privacy     - 개인정보 처리방침
│   └── contact.md                   /contact     - 문의하기
│
├── guides/                (가이드·블로그 x 10)
│   ├── 01-unemployment-benefit-checklist.md
│   ├── 02-youth-monthly-rent-support.md
│   ├── 03-national-scholarship-guide.md
│   ├── 04-first-meeting-voucher.md
│   ├── 05-energy-voucher.md
│   ├── 06-car-tax-refund.md
│   ├── 07-jeonse-loan-guide.md
│   ├── 08-parent-allowance.md
│   ├── 09-naeil-baeum-card.md
│   └── 10-catastrophic-medical-expense.md
│
├── sql/                   (정책 상세페이지 SEO/AEO 일괄 백필)
│   ├── backfill_policy_seo.sql
│   └── prisma_schema_patch.md
│
└── README.md              (이 파일)
```

## 1. 콘텐츠 구조 설계 원칙

### 공통 규칙
- **frontmatter** 로 slug / title / seoTitle / seoDescription / keywords 표준화
- **카테고리·가이드·정적** 세 타입 모두 GitHub flavored Markdown
- H1 은 상단 1개 (제목), H2·H3 로 섹션 구분
- 표·FAQ 는 AEO(Answer Engine Optimization) 용 질문-답변 구조
- 각 글 말미에 **관련 제도 링크 섹션** 포함

### SEO/AEO 전략
- `seoTitle`: **브랜드 + 키워드 + 연도** 구조 (예: "실업급여 신청 조건·기간·금액 완벽 가이드 (2026) | 고브메이트")
- `seoDescription`: 150~160자, 핵심 수치 포함
- `keywords`: 본인 지역 + 제도명 + 변형 키워드
- 글 내부에 **"한 줄 요약" + 테이블** 포함 → 구글 Rich Result, Perplexity/ChatGPT 인용에 유리

## 2. 저장 위치 매핑 (repo)

### 카테고리 랜딩 (기존 `/welfare/categories/[slug]` 페이지에 주입)

```
categories/refund.md         →   카테고리 slug "refund" 에 대한 intro 콘텐츠
categories/voucher.md        →   slug "voucher"
categories/subsidy.md        →   slug "subsidy"
categories/loan.md           →   slug "loan"
categories/grant.md          →   slug "grant"
categories/education.md      →   slug "education"
categories/housing.md        →   slug "housing"
categories/medical.md        →   slug "medical"
categories/employment.md     →   slug "employment"
categories/culture.md        →   slug "culture"
categories/pregnancy-childcare.md   →   slug "pregnancy-childcare" (사이트에 없다면 생성)
```

**주입 방식 2가지**

#### (A) DB 에 컬럼 추가해서 저장 (권장)
```prisma
model Category {
  id            Int
  slug          String   @unique
  name          String
  emoji         String?
  intro         String?  @db.Text       // 여기에 Markdown 원문
  seoTitle      String?
  seoDescription String?
  faqJson       Json?
  updatedAt     DateTime @updatedAt
}
```

```sql
-- intro 컬럼 1회 생성
ALTER TABLE "Category"
  ADD COLUMN IF NOT EXISTS "intro"          text,
  ADD COLUMN IF NOT EXISTS "seoTitle"       text,
  ADD COLUMN IF NOT EXISTS "seoDescription" text,
  ADD COLUMN IF NOT EXISTS "faqJson"        jsonb;
```

그 다음 각 markdown 파일의 **frontmatter + 본문** 을 파싱해서 UPDATE. Node.js 스크립트 예:

```ts
// scripts/import-category-intros.ts
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { prisma } from '@/lib/prisma'

const dir = './content-pack/categories'

for (const file of fs.readdirSync(dir)) {
  const { data, content } = matter(fs.readFileSync(path.join(dir, file), 'utf8'))
  await prisma.category.update({
    where: { slug: data.slug },
    data: {
      intro: content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    },
  })
}
```

#### (B) 파일 시스템으로 번들 (간단)
`/src/content/categories/{slug}.md` 로 놓고 빌드 타임에 `fs.readFileSync` + `remark` 로 렌더.

### 정적 페이지 (라우트로 그대로 렌더)

```
static/about.md       →   app/(public)/about/page.tsx
static/terms.md       →   app/(public)/terms/page.tsx
static/privacy.md     →   app/(public)/privacy/page.tsx
static/contact.md     →   app/(public)/contact/page.tsx
```

Next.js 라우트에서 `remark`/`react-markdown` 으로 렌더하거나, 한 번은 수동으로 JSX 변환. 4개뿐이니 **수동 변환 추천**.

샘플 (`app/(public)/about/page.tsx`):
```tsx
import fs from 'node:fs/promises'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

export const revalidate = 86400   // 하루

async function loadMd(slug: string) {
  const raw = await fs.readFile(`src/content/static/${slug}.md`, 'utf8')
  const { data, content } = matter(raw)
  const processed = await remark().use(html).process(content)
  return { meta: data, html: processed.toString() }
}

export async function generateMetadata() {
  const { meta } = await loadMd('about')
  return { title: meta.seoTitle, description: meta.seoDescription }
}

export default async function AboutPage() {
  const { html } = await loadMd('about')
  return (
    <article className="prose prose-slate mx-auto max-w-3xl px-5 py-10"
             dangerouslySetInnerHTML={{ __html: html }} />
  )
}
```

### 가이드 글 (`/welfare/guide/[slug]` 또는 `/guides/[slug]`)

```
guides/*.md   →   app/(public)/guide/[slug]/page.tsx
```

**권장 URL**: `/guide/unemployment-benefit-checklist`

DB 에 Guide 테이블 새로 만드는 게 장기적으로 유리:

```prisma
model Guide {
  id              Int       @id @default(autoincrement())
  slug            String    @unique
  title           String
  category        String?
  tags            String[]
  content         String    @db.Text
  seoTitle        String?
  seoDescription  String?
  keywords        String[]
  ogImage         String?
  publishedAt     DateTime?
  updatedAt       DateTime  @updatedAt
}
```

## 3. 정책 상세페이지 SEO/AEO 일괄 백필

`sql/backfill_policy_seo.sql` 을 Supabase SQL Editor 에서 실행하면 **1,300건 Policy 전체**에 대해:

1. `seoTitle` (없는 것만)
2. `seoDescription` (없는 것만, 150자 요약)
3. `aiSummary` (없는 것만, LLM 인용용 한 줄)
4. `howToApply` JSONB (5단계 템플릿)
5. `faqJson` JSONB (5개 질문 템플릿)
6. `applyUrl` 정리 (http → https, trim)

이 스크립트는 **기존 값이 있으면 건드리지 않습니다.** 빈 필드만 채움. 보수적으로 안전.

### 실행 절차

```sql
-- 1. 먼저 DB 백업 (Supabase → Settings → Backups)

-- 2. 트랜잭션으로 사전 점검
BEGIN;
\i sql/backfill_policy_seo.sql
-- 결과 수 확인
-- 만족스러우면 COMMIT; 아니면 ROLLBACK;
```

Supabase SQL Editor 는 `\i` 미지원. 파일 내용 전체를 복사-붙여넣기 하세요.

### Prisma schema 동기화
`sql/prisma_schema_patch.md` 참고. ALTER 후 `npx prisma db pull` 로 schema 에 반영.

## 4. 렌더링 & SEO 적용

### 카테고리 상세 페이지에 intro 출력

```tsx
// app/(public)/welfare/categories/[slug]/page.tsx
async function loadCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug }})
}

export async function generateMetadata({ params }) {
  const c = await loadCategory(params.slug)
  return {
    title: c?.seoTitle ?? `${c?.name} 총정리 | 고브메이트`,
    description: c?.seoDescription,
  }
}

export default async function CategoryPage({ params }) {
  const c = await loadCategory(params.slug)
  // ...
  return (
    <>
      <HeroHeader name={c.name} emoji={c.emoji} count={c._count.policies} />

      {c.intro && (
        <section className="prose prose-slate mx-auto max-w-3xl px-5 py-8">
          <MarkdownRenderer source={c.intro} />
        </section>
      )}

      <PolicyList categoryId={c.id} />
    </>
  )
}
```

### 정책 상세에 JSON-LD 주입 (GEO)

```tsx
import Script from 'next/script'

const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: `${p.title} 신청 방법`,
  step: (p.howToApply as any[]).map(s => ({
    '@type': 'HowToStep', name: s.title, text: s.description
  })),
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: (p.faqJson as any[]).map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

<Script type="application/ld+json" id="howto-ld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
<Script type="application/ld+json" id="faq-ld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
```

이 두 개 스키마만 들어가도 Google **Rich Result** 노출 + Perplexity/ChatGPT 가 답변에 인용할 확률이 대폭 상승합니다.

### 가이드 인덱스 (`/guide`)
```tsx
// app/(public)/guide/page.tsx
const guides = await prisma.guide.findMany({ orderBy: { publishedAt: 'desc' }})

return guides.map(g => (
  <Link key={g.slug} href={`/guide/${g.slug}`}>
    <article>
      <h3>{g.title}</h3>
      <p>{g.seoDescription}</p>
      <span>{g.category}</span>
    </article>
  </Link>
))
```

## 5. 적용 순서 (권장)

1. **sql/backfill_policy_seo.sql** 을 트랜잭션으로 먼저 실행 → Policy 1,300건에 seoTitle/seoDescription/aiSummary/howTo/FAQ 채움
2. **Prisma schema** 에 새 필드 반영 후 `prisma generate`
3. 정책 상세 페이지에 **JSON-LD 2종(HowTo, FAQ)** 주입 코드 추가
4. **Category 테이블에 intro/seoTitle/seoDescription 컬럼 추가** → `scripts/import-category-intros.ts` 로 10개 카테고리 채우기
5. 카테고리 상세 페이지에 intro 렌더 섹션 추가
6. `/about /terms /privacy /contact` 4개 라우트 추가 → static/*.md 렌더
7. **Guide 모델 신규 생성** → 10개 가이드 import
8. `/guide` 인덱스 페이지 + `/guide/[slug]` 상세 페이지
9. **sitemap.xml** 에 /guide, /welfare/categories/*, static 4개 모두 포함
10. Google Search Console 에 sitemap 재제출

## 6. 콘텐츠 지속 관리

### 월 1회 체크
- 정책 `updatedAt` 이 6개월 이상 지난 건 관리자 알림
- 마감된 제도는 `status = ARCHIVED` 로 전환
- 각 지원금 금액 변경 시 aiSummary 재생성

### 분기별
- 가이드 글 중 **소득기준·상한액** 이 변경된 건 본문 갱신
- `publishedAt` 과 별도로 `updatedAt` 표시해 신뢰도 향상

### AEO 성과 측정
- Google Search Console 에서 **How-to / FAQ 리치 결과** 노출 확인
- Perplexity/ChatGPT 에서 "{제도명} 신청 방법" 쿼리 결과 인용 확인 (월 1회 수동)

## 7. 향후 추가 아이디어

- **지역 랜딩** (`/welfare/region/seoul`, `/welfare/region/busan`) 16개 광역시도
- **대상자 랜딩** (`/for/youth`, `/for/senior`, `/for/family`) 5~6개
- **월별 마감 임박 페이지** (`/deadline/2026-05`) 월 1회 자동 생성
- **정책 비교 페이지** (`/compare?ids=1,2,3`) 3~5개 비교표
- **블로그 RSS** (`/feed.xml`) AI 크롤러용

## 요약

| 콘텐츠 | 파일 수 | 장르 | 예상 단어 수 | 적용 방식 |
|---|---|---|---|---|
| 카테고리 intro | 10 | 메타·FAQ 혼합 | 600~800 ea | Category.intro 저장 |
| 정적 페이지 | 4 | 법/소개 | 500~1,500 ea | MD → 라우트 |
| 가이드 글 | 10 | 블로그 | 1,500~2,000 ea | Guide 테이블 |
| Policy SQL | 1 | DB 백필 | 1,300 행 × 5필드 | 트랜잭션 UPDATE |

모두 합치면 **약 40,000~50,000 단어의 SEO·AEO 콘텐츠**. 이만큼 일괄 주입되면 도메인 authority 와 색인 속도에 큰 차이가 생깁니다.

---

## 작성자 메모

- 숫자/금액은 2026년 4월 기준. 이후 제도 개정 시 업데이트 필요.
- 각 카테고리의 실제 데이터베이스 `count` 값은 렌더링 시점에 주입되므로 frontmatter 의 `count: N` 값은 무시해도 OK (또는 빌드 타임에 동기화).
- 가이드 글 10개는 트래픽 잠재력이 높은 키워드 기준 (실업급여 / 청년 월세 / 국가장학금 / 첫만남이용권 / 에너지바우처 / 자동차세 환급 / 버팀목 전세대출 / 부모급여 / 내일배움카드 / 재난적 의료비).
- 법률·세무 관련 표현은 "원칙", "일반적으로" 같은 여지를 두어 확정적 조언을 피했음.
