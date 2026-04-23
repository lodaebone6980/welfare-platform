/**
 * 정책 타입(다중 뱃지) 추론
 * ---------------------------------------------------------------
 * 단일 category(생활안정·주거·교육 등) 외에 정책 카드/상세 페이지에 노출할
 * "정책 형태" 뱃지를 다중으로 추출합니다.
 *
 * 우선순위:
 *   1) policy.tags (콤마/파이프 구분 문자열) — 운영자가 직접 지정한 값 우선
 *   2) inferTypeBadgesByText() — 제목/본문/지원대상 등 텍스트에서 키워드 매칭
 *
 * 반환: 최대 3개의 PolicyTypeBadge (중복 제거, 우선순위 순)
 * 시각적 균형을 위해 한 카드에 3개로 제한.
 */

export interface PolicyTypeBadge {
  /** 표시 라벨 (예: "지역화폐") */
  label: string;
  /** Tailwind 클래스 (배경+글자색) */
  className: string;
  /** 추론 키 (정렬·중복제거용) */
  key: string;
}

interface PolicyLikeForTags {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  description?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  tags?: string | null;
}

/**
 * 키워드 → 뱃지 매핑 테이블
 * 우선순위는 배열 순서. 같은 정책에 여러 키가 매칭되면 위에 있는 것이 먼저.
 */
const TYPE_RULES: ReadonlyArray<{
  key: string;
  label: string;
  className: string;
  patterns: RegExp[];
}> = [
  {
    key: 'local-currency',
    label: '지역화폐',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
    patterns: [
      /지역화폐/,
      /온누리상품권/,
      /지역사랑상품권/,
      /상생소비/,
      /상생카드/,
    ],
  },
  {
    key: 'cash',
    label: '현금지급',
    className: 'bg-rose-50 text-rose-700 border border-rose-200',
    patterns: [
      /현금/,
      /\d+\s*만\s*원/,
      /\d+\s*원\s*지급/,
      /지원금|보조금|수당|급여|장려금|보상금/,
      /지급(?!\s*기관)/,
    ],
  },
  {
    key: 'micro-finance',
    label: '서민금융',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
    patterns: [
      /대출|융자/,
      /미소금융|햇살론|새희망홀씨|바꿔드림론/,
      /채무\s*조정|채무\s*감면/,
      /신용회복/,
      /이자\s*지원/,
    ],
  },
  {
    key: 'voucher',
    label: '바우처',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
    patterns: [/바우처/, /쿠폰/, /이용권/, /카드형\s*지원/],
  },
  {
    key: 'tax-refund',
    label: '환급·감면',
    className: 'bg-green-50 text-green-700 border border-green-200',
    patterns: [/환급/, /감면/, /면제/, /공제/, /할인/, /세제\s*혜택/],
  },
  {
    key: 'housing',
    label: '주거지원',
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
    patterns: [
      /주거/,
      /임대|전세|월세/,
      /보증금/,
      /청약/,
      /주택/,
    ],
  },
  {
    key: 'job',
    label: '일자리',
    className: 'bg-teal-50 text-teal-700 border border-teal-200',
    patterns: [
      /일자리|취업|구직/,
      /창업/,
      /직업\s*훈련/,
      /고용\s*지원/,
      /실업\s*급여/,
    ],
  },
  {
    key: 'education',
    label: '교육·장학',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    patterns: [
      /장학금/,
      /학자금/,
      /교육비/,
      /수업료/,
      /학비/,
    ],
  },
  {
    key: 'health',
    label: '건강·의료',
    className: 'bg-pink-50 text-pink-700 border border-pink-200',
    patterns: [
      /의료비|병원비|진료비|치료비/,
      /건강\s*검진/,
      /정신\s*건강/,
      /산부인과|난임/,
    ],
  },
  {
    key: 'childcare',
    label: '돌봄·보육',
    className: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    patterns: [
      /보육|어린이집|유치원/,
      /돌봄\s*(서비스|지원)/,
      /아이\s*돌봄/,
      /방과\s*후/,
    ],
  },
  {
    key: 'energy',
    label: '에너지',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    patterns: [
      /에너지\s*바우처|에너지\s*지원/,
      /난방비|연료비|전기요금/,
      /가스요금/,
    ],
  },
];

/**
 * tags 컬럼(콤마/파이프 구분)에서 라벨 후보 추출.
 * 예: "지역화폐, 현금지급, 청년" → ["지역화폐", "현금지급", "청년"]
 */
function parseTagsField(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,|;\/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 운영자 입력 tags 가 미리 정의된 키워드 라벨과 일치하면 해당 뱃지로 매핑 */
function tagsToBadges(tags: string[]): PolicyTypeBadge[] {
  const result: PolicyTypeBadge[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const rule = TYPE_RULES.find((r) => r.label === tag);
    if (rule && !seen.has(rule.key)) {
      seen.add(rule.key);
      result.push({ key: rule.key, label: rule.label, className: rule.className });
    }
  }
  return result;
}

/** 텍스트(제목+발췌+지원대상+신청방법)에서 키워드 매칭으로 뱃지 추론 */
function inferTypeBadgesByText(p: PolicyLikeForTags): PolicyTypeBadge[] {
  const haystack = [
    p.title,
    p.excerpt,
    p.description,
    p.content,
    p.eligibility,
    p.applicationMethod,
  ]
    .filter(Boolean)
    .join(' \n ');

  if (!haystack.trim()) return [];

  const result: PolicyTypeBadge[] = [];
  const seen = new Set<string>();

  for (const rule of TYPE_RULES) {
    if (rule.patterns.some((re) => re.test(haystack))) {
      if (!seen.has(rule.key)) {
        seen.add(rule.key);
        result.push({ key: rule.key, label: rule.label, className: rule.className });
      }
    }
  }
  return result;
}

/**
 * 정책 타입 다중 뱃지 (최대 N개)
 * 1) tags 컬럼 우선
 * 2) 부족하면 텍스트 추론으로 보강
 */
export function inferPolicyTypes(
  policy: PolicyLikeForTags,
  options: { max?: number } = {}
): PolicyTypeBadge[] {
  const { max = 3 } = options;

  const fromTags = tagsToBadges(parseTagsField(policy.tags));
  const fromText = inferTypeBadgesByText(policy);

  // 우선순위: tags → text 추론 (중복 제거)
  const merged: PolicyTypeBadge[] = [];
  const seen = new Set<string>();
  for (const b of [...fromTags, ...fromText]) {
    if (!seen.has(b.key)) {
      seen.add(b.key);
      merged.push(b);
      if (merged.length >= max) break;
    }
  }
  return merged;
}
