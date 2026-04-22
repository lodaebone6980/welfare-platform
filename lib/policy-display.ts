/**
 * 정책 화면 표시용 공통 유틸
 * ---------------------------------------------------------------
 * - cleanTitle: 지원금24 / 복지킹 스타일로 제목 노이즈 제거
 * - parseKoreanDate: 한국어 / ISO / 년.월.일 / ~까지 등 다양한 형식 대응
 * - getDday: 'D-N', 'D-DAY', '상시' 판별
 * - extractBenefitSummary: 본문에서 혜택/대상/기간 요약 후보 추출
 */

// ---------------------------------------------------------------
// 제목 정규화
// ---------------------------------------------------------------

// 제목 앞뒤에 붙는 노이즈 (예: [2025년], (서울), 【공고】 등)
const BRACKET_PREFIX = /^[\s\u2000-\u206F]*[\[\(\【\「\『][^\]\)\】\」\』]{0,30}[\]\)\】\」\』]\s*/;
const YEAR_PREFIX = /^\s*20\d{2}년?\s*(?:[-ㆍ·]|\s)?\s*/;
// 뒤쪽 "(안내)", "[공고]", "모집", "안내" 꼬리표
const TAIL_NOISE = /\s*[\(\[\【\「\『](안내|공고|모집|추가모집|재공고|수정|변경)[\)\]\】\」\』]\s*$/;

/**
 * 복지킹 / 지원금24 스타일로 제목 노이즈 제거
 *   예시:
 *     "[2025년 공고] 청년월세지원 (안내)" → "청년월세지원"
 *     "2025년도 근로장려금 신청" → "근로장려금 신청"
 */
export function cleanTitle(title: string | null | undefined): string {
  if (!title) return '';
  let t = title.trim();
  // 반복 제거 (대괄호가 2번 이상 있어도 벗기기)
  for (let i = 0; i < 3; i++) {
    const next = t.replace(BRACKET_PREFIX, '');
    if (next === t) break;
    t = next;
  }
  t = t.replace(YEAR_PREFIX, '');
  t = t.replace(TAIL_NOISE, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t || (title.trim());
}

// ---------------------------------------------------------------
// 마감일 파서
// ---------------------------------------------------------------

// 숫자 한글 혼재 → 연월일 추출 (예: "2025년 12월 31일", "2025.12.31", "2025-12-31", "12월 31일까지")
const DATE_PATTERNS: RegExp[] = [
  /(\d{4})\s*[\.\-년]\s*(\d{1,2})\s*[\.\-월]\s*(\d{1,2})/,
  /(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/,
  /(\d{4})(\d{2})(\d{2})/,
];

// 연도 없이 "12월 31일까지" 형태
const MONTH_DAY_ONLY = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/;

export function parseKoreanDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  for (const re of DATE_PATTERNS) {
    const m = s.match(re);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const dt = new Date(y, mo, d);
      if (!isNaN(dt.getTime()) && dt.getFullYear() > 1999) return dt;
    }
  }

  // 연도가 없는 경우 → 올해 or 내년으로 추정
  const md = s.match(MONTH_DAY_ONLY);
  if (md) {
    const now = new Date();
    const mo = parseInt(md[1], 10) - 1;
    const d = parseInt(md[2], 10);
    let y = now.getFullYear();
    const candidate = new Date(y, mo, d);
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      y += 1;
    }
    const dt = new Date(y, mo, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // ISO fallback
  const iso = new Date(s);
  if (!isNaN(iso.getTime()) && iso.getFullYear() > 1999) return iso;

  return null;
}

export function isAlwaysOpen(deadline: string | null | undefined): boolean {
  if (!deadline) return true;
  return /상시|수시|연중|무기한|별도없음|해당없음/.test(deadline);
}

export function getDday(
  deadline: string | Date | null | undefined
): { text: string; urgent: boolean; always: boolean } | null {
  if (!deadline) return { text: '상시', urgent: false, always: true };
  const raw = typeof deadline === 'string' ? deadline : deadline.toISOString();
  if (isAlwaysOpen(raw)) return { text: '상시', urgent: false, always: true };

  const dl =
    typeof deadline === 'string'
      ? parseKoreanDate(deadline)
      : isNaN(deadline.getTime())
      ? null
      : deadline;
  if (!dl) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dl);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: '마감', urgent: true, always: false };
  if (diff === 0) return { text: 'D-DAY', urgent: true, always: false };
  return { text: `D-${diff}`, urgent: diff <= 14, always: false };
}

// ---------------------------------------------------------------
// 혜택 요약 추출
// ---------------------------------------------------------------

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 정책 본문 / excerpt 로부터 "지원금액 / 지원대상 / 신청기간" 3줄 요약 후보 뽑기.
 * 파싱 실패는 그냥 빈 문자열 반환 — UI 쪽에서 폴백 처리.
 */
export function extractBenefitSummary(input: {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  description?: string | null;
  eligibility?: string | null;
  deadline?: string | null;
  applicationMethod?: string | null;
}): { amount: string; target: string; period: string } {
  const text = stripHtml(
    [input.excerpt, input.description, input.content].filter(Boolean).join(' '),
  );

  // 금액: "월 20만원", "최대 200만원", "연 최대 330만원", "100만원"
  let amount = '';
  const mAmount =
    text.match(/최대\s*(?:연|월)?\s*[\d,]+\s*(?:억|천만|백만|만)원/) ||
    text.match(/(?:월|연)\s*(?:최대\s*)?[\d,]+\s*(?:억|천만|백만|만)원/) ||
    text.match(/[\d,]+\s*(?:억|천만|백만|만)원/);
  if (mAmount) amount = mAmount[0].replace(/\s{2,}/g, ' ');

  // 지원대상: eligibility 첫 문장 → 없으면 본문 "대상" 언급 주변
  let target = '';
  if (input.eligibility) {
    target = stripHtml(input.eligibility).split(/[\.。]\s|\n/)[0].slice(0, 60);
  }
  if (!target) {
    const m = text.match(/(?:지원\s*대상|신청\s*대상|대상자?)\s*[:：·\-]?\s*([^\.。\n]{5,50})/);
    if (m) target = m[1].trim();
  }

  // 기간: deadline 원문 우선
  const period = input.deadline || '';

  return { amount, target, period };
}

// ---------------------------------------------------------------
// 간단 요약 (카드용) — 1줄
// ---------------------------------------------------------------
export function oneLineSummary(input: {
  excerpt?: string | null;
  content?: string | null;
  description?: string | null;
}): string {
  const raw = input.excerpt || input.description || input.content || '';
  const t = stripHtml(raw);
  if (!t) return '';
  const firstSentence = t.split(/[\.。]\s|\n/)[0];
  return firstSentence.length > 80 ? firstSentence.slice(0, 80) + '…' : firstSentence;
}
