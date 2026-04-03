const REGION_CODES: Record<string, string> = {
  서울: '11', 경기: '41', 부산: '26', 인천: '28',
  대구: '27', 대전: '30', 광주: '29', 울산: '31',
  세종: '36', 강원: '42', 충북: '43', 충남: '44',
  전북: '45', 전남: '46', 경북: '47', 경남: '48', 제주: '50',
}

interface SeoInput {
  title:        string
  excerpt:      string
  slug:         string
  focusKeyword: string
  geoRegion?:   string
  geoDistrict?: string
  latitude?:    number
  longitude?:   number
  faqs?:        { q: string; a: string }[]
  publishedAt?: string
}

export function buildMetaTags(post: SeoInput) {
  const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://yourdomain.com'
  const url      = `${BASE_URL}/welfare/${post.slug}`
  const geoTitle = post.geoRegion
    ? `${post.geoRegion} ${post.title}`
    : post.title

  return {
    title:       `${geoTitle} | 정책자금넷`,
    description: post.excerpt,
    canonical:   url,

    openGraph: {
      type:        'article',
      url,
      title:       geoTitle,
      description: post.excerpt,
      locale:      'ko_KR',
      siteName:    '정책자금넷',
    },

    // GEO 메타태그
    other: {
      'geo.region': `KR${REGION_CODES[post.geoRegion ?? ''] ? `-${REGION_CODES[post.geoRegion!]}` : ''}`,
      'geo.placename': post.geoDistrict ?? post.geoRegion ?? '대한민국',
      ...(post.latitude && {
        'geo.position': `${post.latitude};${post.longitude}`,
        'ICBM':         `${post.latitude}, ${post.longitude}`,
      }),
    },

    // JSON-LD 구조화 데이터
    jsonLd: buildJsonLd(post, url, geoTitle),
  }
}

function buildJsonLd(post: SeoInput, url: string, geoTitle: string) {
  const graph: object[] = [
    {
      '@type':     'Article',
      '@id':       url,
      headline:    geoTitle,
      description: post.excerpt,
      url,
      inLanguage:  'ko',
      datePublished: post.publishedAt,
      author:      { '@type': 'Organization', name: '정책자금넷' },
      publisher: {
        '@type': 'Organization',
        name:    '정책자금넷',
        logo:    { '@type': 'ImageObject', url: `${process.env.NEXTAUTH_URL}/logo.png` },
      },
    },
  ]

  // FAQ 스키마 — 구글 FAQ 리치 결과
  if (post.faqs && post.faqs.length > 0) {
    graph.push({
      '@type':    'FAQPage',
      mainEntity: post.faqs.map(faq => ({
        '@type': 'Question',
        name:    faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}
