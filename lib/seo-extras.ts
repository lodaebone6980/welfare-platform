import { SITE_URL, SITE_NAME } from '@/lib/env'

/**
 * 기존 lib/seo.ts 를 건드리지 않고 확장 JSON-LD 헬퍼들을 모아둔 모듈.
 * - HowTo (신청 방법 단계)
 * - Speakable (구글 어시스턴트/보이스 SEO)
 * - Region landing (CollectionPage + ItemList)
 * - Organization (국민자료실 브랜드)
 * - SearchBox WebSite
 */

export type HowToStep = { name: string; text: string; url?: string }

export function generateHowToJsonLd(params: {
  name: string
  description?: string
  totalTime?: string // ISO-8601 duration, e.g. "PT15M"
  steps: HowToStep[]
  url?: string
}) {
  if (!params.steps || params.steps.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: params.name,
    description: params.description,
    totalTime: params.totalTime,
    ...(params.url ? { url: params.url } : {}),
    step: params.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
    })),
  }
}

/**
 * 정책 본문에서 신청 흐름을 Step으로 자동 조립.
 * 본문에 explicit step 이 없으면 간단 기본 스텝을 돌려준다.
 */
export function buildDefaultPolicyHowTo(policy: {
  title: string
  slug: string
  applicationMethod?: string | null
  applyUrl?: string | null
  requiredDocuments?: string | null
}) {
  const steps: HowToStep[] = []
  if (policy.requiredDocuments) {
    steps.push({
      name: '필요 서류 준비',
      text: String(policy.requiredDocuments).slice(0, 300),
    })
  }
  if (policy.applicationMethod) {
    steps.push({
      name: '신청 방법 확인',
      text: String(policy.applicationMethod).slice(0, 300),
    })
  }
  if (policy.applyUrl) {
    steps.push({
      name: '온라인 신청',
      text: '공식 신청 페이지에서 본인 인증 후 신청서를 제출합니다.',
      url: policy.applyUrl,
    })
  } else {
    steps.push({
      name: '관할 기관 방문',
      text: '해당 지자체·센터·주민센터에서 접수합니다.',
    })
  }
  steps.push({
    name: '결과 확인',
    text: '심사 후 지급/통보 결과를 확인합니다.',
  })
  return generateHowToJsonLd({
    name: `${policy.title.replace(/^\[.*?\]\s*/, '')} 신청 방법`,
    description: '정부 지원금 신청 절차를 단계별로 안내합니다.',
    steps,
    url: `${SITE_URL}/welfare/${encodeURIComponent(policy.slug)}`,
  })
}

/**
 * Speakable Specification — 뉴스/리스트형 콘텐츠에서 voice search 대응.
 */
export function generateSpeakableJsonLd(cssSelectors: string[] = [
  'article h1',
  'article .lead',
  'article h2',
]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: cssSelectors,
  }
}

/**
 * 지역 랜딩 페이지용 CollectionPage + ItemList.
 */
export function generateRegionLandingJsonLd(params: {
  regionName: string
  regionSlug: string
  items: { title: string; slug: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${params.regionName} 정부지원금 모음`,
        url: `${SITE_URL}/welfare/region/${encodeURIComponent(params.regionSlug)}`,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
        },
        about: {
          '@type': 'AdministrativeArea',
          name: params.regionName,
        },
      },
      {
        '@type': 'ItemList',
        itemListElement: params.items.slice(0, 50).map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: it.title,
          url: `${SITE_URL}/welfare/${encodeURIComponent(it.slug)}`,
        })),
      },
    ],
  }
}

/**
 * Organization 스키마 — 푸터/홈/About 에 공통 사용.
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean'],
    },
  }
}

/**
 * SearchBox 사이트링크 검색 — 구글이 홈에서 인식.
 */
export function generateSitelinksSearchJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE_URL,
    name: SITE_NAME,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/welfare/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
