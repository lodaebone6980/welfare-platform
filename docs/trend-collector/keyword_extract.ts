/**
 * 키워드 추출/정규화/유사도 계산 유틸
 * ------------------------------------------------------------------
 * - normalizeTopic(): 다양한 표기(예: "유가지원금", "유가 지원금", "유가피해지원금")를 하나의 토픽 키로 정규화
 * - extractFromTitle(): 뉴스 제목에서 정책성 키워드만 추출
 * - cosineSimilarity(): 새 후보 토픽이 기존 Policy 제목과 몇 %나 겹치는지 판정 (>=0.85면 중복)
 * ------------------------------------------------------------------
 * 실제 프로덕션에서는 형태소 분석기(khaiii, mecab-ko, nori) 사용을 권장하지만,
 * 서버리스(Vercel) 환경 제약 상 순수 JS 구현으로 유지한다.
 */

const STOPWORDS = new Set([
  '지원금', '보조금', '수당', '바우처', '환급', '급여', '지원',
  '사업', '제도', '혜택', '신청', '대상', '안내', '발표', '시행',
  '관련', '등', '및', '에', '를', '의', '은', '는', '이', '가',
  '정부', '국가', '서울', '경기', '부산', '지자체',
  '2024', '2025', '2026',
]);

/**
 * 주제어 정규화.
 * 예) "유가 피해지원금"     → "유가피해"
 *     "에너지 바우처 2025"  → "에너지"
 *     "청년 월세 특별지원"  → "청년월세특별"
 */
export function normalizeTopic(input: string): string {
  if (!input) return '';
  let s = input.replace(/[^\uAC00-\uD7AF\w\s]/g, ' '); // 한글/영숫자만
  s = s.replace(/\s+/g, ' ').trim();

  // 토큰 분해 후 stopword 제거
  const tokens = s
    .split(' ')
    .flatMap((tok) => splitByStopwordSubstring(tok))
    .filter((tok) => tok.length >= 2 && !STOPWORDS.has(tok));

  return tokens.join('').slice(0, 40) || s.replace(/\s+/g, '').slice(0, 40);
}

/**
 * "유가피해지원금" 같이 한 단어로 붙은 경우에도 "지원금" 접미사를 잘라낸다.
 */
function splitByStopwordSubstring(token: string): string[] {
  const result: string[] = [];
  let rest = token;
  for (const sw of STOPWORDS) {
    if (sw.length < 2) continue;
    while (rest.includes(sw)) {
      const idx = rest.indexOf(sw);
      const left = rest.slice(0, idx);
      const right = rest.slice(idx + sw.length);
      if (left) result.push(left);
      rest = right;
    }
  }
  if (rest) result.push(rest);
  return result.length > 0 ? result : [token];
}

/**
 * 뉴스 제목에서 "정책성 키워드"로 보이는 것만 추출.
 * (지원금/보조금/수당/바우처/환급/급여/장려금/특별지원 등이 포함된 노출 단위)
 */
const POLICY_SUFFIXES = ['지원금', '보조금', '수당', '바우처', '환급', '급여', '장려금', '특별지원', '피해지원', '긴급지원', '재난지원'];

export function extractFromTitle(title: string): string[] {
  if (!title) return [];
  const cleaned = title.replace(/\[[^\]]+\]/g, ' ').replace(/\([^)]*\)/g, ' ');
  const out = new Set<string>();

  for (const suffix of POLICY_SUFFIXES) {
    const re = new RegExp(`[\\uAC00-\\uD7AF\\w]{1,8}${suffix}`, 'g');
    const matches = cleaned.match(re);
    if (matches) matches.forEach((m) => out.add(m.trim()));
  }
  return [...out];
}

/**
 * 문자 N-gram 기반 Cosine Similarity (0~1).
 * 기존 정책 제목과 후보 주제 사이의 중복 감지에 사용.
 */
export function cosineSimilarity(a: string, b: string, n = 2): number {
  if (!a || !b) return 0;
  const va = ngramVector(a, n);
  const vb = ngramVector(b, n);

  const keys = new Set([...va.keys(), ...vb.keys()]);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const x = va.get(k) ?? 0;
    const y = vb.get(k) ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function ngramVector(text: string, n: number): Map<string, number> {
  const v = new Map<string, number>();
  const s = text.replace(/\s+/g, '');
  if (s.length < n) {
    v.set(s, 1);
    return v;
  }
  for (let i = 0; i <= s.length - n; i++) {
    const gram = s.slice(i, i + n);
    v.set(gram, (v.get(gram) ?? 0) + 1);
  }
  return v;
}
