export type PolicyQualityInput = {
  title?: string | null;
  content?: string | null;
  excerpt?: string | null;
  description?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  requiredDocuments?: string | null;
  applyUrl?: string | null;
  externalUrl?: string | null;
  category?: { slug?: string | null; name?: string | null } | null;
  faqs?: Array<{ question?: string | null; answer?: string | null }> | null;
};

export type PolicyQualityReport = {
  indexable: boolean;
  textLength: number;
  completedSections: number;
  missing: string[];
};

const DEFAULT_MIN_CHARS = 900;

function plainText(value?: string | null): string {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_>`~\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningful(value?: string | null, minLength = 80): boolean {
  return plainText(value).length >= minLength;
}

function getMinChars(): number {
  const configured = Number(process.env.POLICY_INDEX_MIN_CHARS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MIN_CHARS;
}

export function getPolicyQualityReport(policy: PolicyQualityInput): PolicyQualityReport {
  const faqText = (policy.faqs || [])
    .map((faq) => `${faq.question || ''} ${faq.answer || ''}`)
    .join(' ');

  const textLength = plainText([
    policy.title,
    policy.excerpt,
    policy.description,
    policy.content,
    policy.eligibility,
    policy.applicationMethod,
    policy.requiredDocuments,
    faqText,
  ].join(' ')).length;

  const checks = [
    {
      label: '요약 또는 본문 설명',
      ok: meaningful(policy.excerpt, 80) || meaningful(policy.description, 140) || meaningful(policy.content, 260),
    },
    { label: '지원 대상', ok: meaningful(policy.eligibility, 80) },
    { label: '신청 방법', ok: meaningful(policy.applicationMethod, 80) },
    { label: '필요 서류 또는 준비사항', ok: meaningful(policy.requiredDocuments, 40) },
    { label: '공식 출처 URL', ok: Boolean(policy.applyUrl || policy.externalUrl) },
    { label: '분류 정보', ok: Boolean(policy.category?.slug || policy.category?.name) },
    { label: 'FAQ 3개 이상', ok: (policy.faqs || []).length >= 3 },
  ];

  const missing = checks.filter((item) => !item.ok).map((item) => item.label);
  const completedSections = checks.length - missing.length;

  return {
    indexable:
      textLength >= getMinChars() &&
      completedSections >= 5 &&
      Boolean(policy.applyUrl || policy.externalUrl) &&
      (meaningful(policy.eligibility, 80) || meaningful(policy.applicationMethod, 80)),
    textLength,
    completedSections,
    missing,
  };
}

export function isPolicyIndexableForAdsense(policy: PolicyQualityInput): boolean {
  return getPolicyQualityReport(policy).indexable;
}

export function getPolicySourceUrl(policy: PolicyQualityInput): string | null {
  return policy.applyUrl || policy.externalUrl || null;
}
