/**
 * Policy 입력 정규화 (zod 미설치 환경용 경량 validator)
 * ------------------------------------------------------------------
 * 파일 위치: lib/schemas/policy.ts
 *
 * 용도: 어드민 Policy 저장/수정 시 사용자가 넣은 값의 마크다운 노이즈를
 *  제거하고 필수값·길이 제한을 체크한다.
 *  - title/excerpt/description 은 plain text로 sanitize
 *  - content 는 HTML/마크다운 그대로 유지 (RichEditor가 관리)
 */

import { sanitizePlainText } from '@/lib/sanitize';

export type PolicyInput = {
  slug?: string;
  title?: string;
  excerpt?: string | null;
  description?: string | null;
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  requiredDocuments?: string | null;
  deadline?: string | null;
  focusKeyword?: string | null;
  metaDesc?: string | null;
  categoryId?: number | null;
  geoRegion?: string | null;
  applyUrl?: string | null;
  featured?: boolean;
  featuredOrder?: number;
  status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
};

export type PolicyValidationError = {
  field: keyof PolicyInput;
  message: string;
};

export function normalizePolicyInput(input: PolicyInput): {
  data: PolicyInput;
  errors: PolicyValidationError[];
} {
  const errors: PolicyValidationError[] = [];
  const data: PolicyInput = { ...input };

  // 제목: 필수 + plain text + 200자 이내
  if (data.title != null) {
    data.title = sanitizePlainText(data.title).slice(0, 200);
    if (!data.title.trim()) {
      errors.push({ field: 'title', message: '제목은 필수입니다.' });
    }
  }

  // 요약: 300자 이내
  if (data.excerpt != null) {
    data.excerpt = sanitizePlainText(data.excerpt).slice(0, 300);
  }

  // 설명: 1000자 이내
  if (data.description != null) {
    data.description = sanitizePlainText(data.description).slice(0, 1000);
  }

  // 지원대상/신청방법/필요서류: plain text 600자
  for (const f of ['eligibility', 'applicationMethod', 'requiredDocuments'] as const) {
    const v = data[f];
    if (v != null) {
      (data as any)[f] = sanitizePlainText(v as string).slice(0, 1200);
    }
  }

  // metaDesc: 160자 이내 (Google/Naver 표시)
  if (data.metaDesc != null) {
    data.metaDesc = sanitizePlainText(data.metaDesc).slice(0, 160);
  }

  // focusKeyword: 40자 이내
  if (data.focusKeyword != null) {
    data.focusKeyword = sanitizePlainText(data.focusKeyword).slice(0, 40);
  }

  // applyUrl: http(s) only
  if (data.applyUrl) {
    if (!/^https?:\/\//i.test(data.applyUrl)) {
      errors.push({ field: 'applyUrl', message: '신청 URL은 http:// 또는 https://로 시작해야 합니다.' });
    }
  }

  // slug: kebab-case 제한 (빈값이면 생성 로직 측에서 생성)
  if (data.slug) {
    data.slug = data.slug.trim().toLowerCase();
    if (!/^[a-z0-9가-힣\-_]+$/.test(data.slug)) {
      errors.push({ field: 'slug', message: 'slug는 소문자/숫자/한글/-/_ 만 사용 가능합니다.' });
    }
  }

  return { data, errors };
}

export function validatePolicyInput(input: PolicyInput): { ok: boolean; data: PolicyInput; errors: PolicyValidationError[] } {
  const { data, errors } = normalizePolicyInput(input);
  return { ok: errors.length === 0, data, errors };
}
