const BASE_URL = 'https://welfare-platform-five.vercel.app';

export interface PolicySeoData {
  title: string;
  slug: string;
  description?: string | null;
  excerpt?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  geoRegion?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  requiredDocuments?: string | null;
  applyUrl?: string | null;
  externalUrl?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  deadline?: string | null;
}

// GovernmentService JSON-LD for each policy
export function generatePolicyJsonLd(policy: PolicySeoData) {
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: policy.title.replace(/^\[.*?\]\s*/, ''),
    description: policy.excerpt || policy.description || policy.title,
    url: BASE_URL + '/welfare/' + encodeURIComponent(policy.slug),
    provider: {
      '@type': 'GovernmentOrganization',
      name: policy.geoRegion ? policy.geoRegion + ' 지방자치단체' : '대한민국 정부',
      url: 'https://www.gov.kr',
    },
    serviceType: policy.category || '복지서비스',
    areaServed: {
      '@type': 'AdministrativeArea',
      name: policy.geoRegion || '대한민국',
    },
  };

  if (policy.applyUrl) {
    jsonLd.potentialAction = {
      '@type': 'ApplyAction',
      target: policy.applyUrl,
      name: '신청하기',
    };
  }

  return jsonLd;
}

// BreadcrumbList JSON-LD
export function generateBreadcrumbJsonLd(policy: PolicySeoData) {
  const items = [
    { name: '홈', url: BASE_URL },
    { name: '정책검색', url: BASE_URL + '/welfare/search' },
  ];

  if (policy.category && policy.categorySlug) {
    items.push({
      name: policy.category,
      url: BASE_URL + '/welfare/categories/' + encodeURIComponent(policy.categorySlug),
    });
  }

  items.push({
    name: policy.title.replace(/^\[.*?\]\s*/, '').substring(0, 50),
    url: BASE_URL + '/welfare/' + encodeURIComponent(policy.slug),
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// FAQ JSON-LD for AEO (Answer Engine Optimization)
export function generateFaqJsonLd(policy: PolicySeoData) {
  const faqItems: { question: string; answer: string }[] = [];
  const cleanTitle = policy.title.replace(/^\[.*?\]\s*/, '');

  if (policy.eligibility) {
    faqItems.push({
      question: cleanTitle + ' 지원 대상은 누구인가요?',
      answer: policy.eligibility.substring(0, 500),
    });
  }

  if (policy.applicationMethod) {
    faqItems.push({
      question: cleanTitle + ' 신청 방법은 어떻게 되나요?',
      answer: policy.applicationMethod.substring(0, 500),
    });
  }

  if (policy.requiredDocuments) {
    faqItems.push({
      question: cleanTitle + ' 필요한 서류는 무엇인가요?',
      answer: policy.requiredDocuments.substring(0, 500),
    });
  }

  if (policy.description && faqItems.length < 2) {
    faqItems.push({
      question: cleanTitle + '은(는) 어떤 정책인가요?',
      answer: (policy.description || '').substring(0, 500),
    });
  }

  if (faqItems.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// WebSite + Organization for homepage
export function generateHomepageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: '정책지금',
        alternateName: '정책지금 - 정부 지원금 찾기',
        url: BASE_URL,
        description: '나에게 맞는 정부 지원금, 보조금, 복지 혜택을 한눈에 찾아보세요.',
        inLanguage: 'ko-KR',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: BASE_URL + '/welfare/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        name: '정책지금',
        url: BASE_URL,
        logo: BASE_URL + '/icon-512.png',
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: 'Korean',
        },
      },
    ],
  };
}

// Generate meta description for policy
export function generatePolicyMetaDescription(policy: PolicySeoData): string {
  const cleanTitle = policy.title.replace(/^\[.*?\]\s*/, '');
  const region = policy.geoRegion ? '[' + policy.geoRegion + '] ' : '';
  const category = policy.category ? policy.category + ' - ' : '';
  const desc = policy.excerpt || policy.description || '';
  const base = region + category + cleanTitle;
  
  if (desc) {
    return (base + '. ' + desc).substring(0, 155) + '...';
  }
  return (base + ' 지원 대상, 신청 방법, 필요 서류를 확인하세요. | 정책지금').substring(0, 155);
}

// Generate Open Graph data for policy
export function generatePolicyOgData(policy: PolicySeoData) {
  return {
    title: policy.title + ' | 정책지금',
    description: generatePolicyMetaDescription(policy),
    url: BASE_URL + '/welfare/' + encodeURIComponent(policy.slug),
    siteName: '정책지금',
    locale: 'ko_KR',
    type: 'article' as const,
  };
}
