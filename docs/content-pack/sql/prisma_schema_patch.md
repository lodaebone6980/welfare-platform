## Prisma schema.prisma 에 추가할 필드

SQL로 컬럼을 추가한 뒤 Prisma schema 에도 반영해서 `prisma generate` 해주세요.

```prisma
model Policy {
  id            Int      @id @default(autoincrement())

  // ...기존 필드

  // === SEO / AEO 섹션 ===
  seoTitle          String?   @db.Text
  seoDescription    String?   @db.Text
  aiSummary         String?   @db.Text     // GEO/AEO 용 한 줄 요약
  howToApply        Json?                    // schema.org HowTo 단계 배열
  faqJson           Json?                    // schema.org FAQPage 배열

  // === 필드는 이미 있을 수 있음 ===
  applyUrl          String?
  source            String?

  updatedAt         DateTime  @updatedAt
}
```

그 다음:

```bash
# 마이그레이션 동기화
npx prisma db pull          # (권장) DB 실제 상태를 schema 로 가져옴
# 또는
npx prisma migrate dev --name add_seo_aeo_fields

npx prisma generate
```

이후 `/app/welfare/policy/[id]/page.tsx` 에서 아래와 같이 렌더 가능:

```tsx
import Script from 'next/script'

export async function generateMetadata({ params }) {
  const p = await getPolicy(params.id)
  return {
    title: p.seoTitle ?? p.title,
    description: p.seoDescription,
    openGraph: { title: p.seoTitle, description: p.seoDescription },
  }
}

// JSON-LD 주입
const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: `${p.title} 신청 방법`,
  step: (p.howToApply as any[]).map(s => ({
    '@type': 'HowToStep',
    name: s.title,
    text: s.description,
  }))
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: (p.faqJson as any[]).map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  }))
}
```

`<Script type="application/ld+json" ...>` 로 두 스키마를 넣어두면 Google/Naver 서치엔진이 Rich Result 로 인식하고,
Perplexity/ChatGPT 등 AI 검색이 그대로 인용하기도 합니다.
