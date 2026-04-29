/**
 * lib/policy-content-generator.ts
 * ------------------------------------------------------------------
 * LLM(OpenAI gpt-4o-mini) 기반 정책 본문 자동 생성.
 *
 * 목적:
 *   API(복지로/공공데이터포털 등)로 수집된 정책은 제목만 있거나 설명이 부실한
 *   경우가 많음 → 구글 인덱싱·AEO·사용자 가독성을 모두 저해.
 *   AdSense "가치 없는 콘텐츠" 거절을 막기 위해 본문을 govhelp/복지킹 수준의
 *   2,500~3,500자 9-섹션 구조로 확장한다.
 *
 * 설계 원칙:
 *   1) 환각 방지 — 원본에 없는 수치/자격/기간은 절대 지어내지 않는다.
 *      불확실한 부분은 "자세한 내용은 담당 기관 공고를 확인" 류로 유도한다.
 *   2) 구조화 — 9-섹션 H2 (한눈에 보기/지원내용/대상/신청방법/제출서류/
 *      처리절차/FAQ/출처/관련정책) 표준 구조로 출력.
 *   3) 행동유도 — "신청·조회·자격 확인·지급" 키워드 5회 이상 자연 포함.
 *   4) 키워드 밀도 — focusKeyword 본문에 5회 이상 자연 노출.
 *   5) AEO + GEO + SEO — FAQPage JSON-LD, 부처명·시행연도·마지막 업데이트
 *      일자, 메타·focusKeyword 모두 채움.
 *   6) 비용 가드 — gpt-4o-mini 고정, MAX_TOKENS 4000, 정책당 최대 2회 호출.
 *
 * 실패 모드:
 *   - JSON 파싱 실패 / 필드 누락 → 1회 재시도 (temperature 0.6) → 그래도 실패면 null
 *   - OpenAI API 오류 → throw, 호출자가 캐치 후 로그
 */

import OpenAI from 'openai';

// 429 / 일시적 네트워크 오류에 대비한 자동 재시도. SDK 기본 2회 → 5회로.
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 5,
  timeout: 90 * 1000,
});

const MODEL = 'gpt-4o'; // gpt-4o-mini 는 9-섹션 풍부 본문 생성에 한계 — 4o 사용
const TEMPERATURE_PRIMARY = 0.4;
const TEMPERATURE_RETRY = 0.6;
const MAX_TOKENS = 8000; // gpt-4o 응답이 9-섹션 + FAQ 6~8개로 길어 충분 확보

// 검증 임계값 (validate + needsGeneration 공유).
// gpt-4o 2-phase 실험 결과: 본문 평문이 자연스럽게 1300~1500자에 수렴.
// 1300자는 govmate 현재 평균 500자 대비 2.6배, AdSense 풍부화 1차 목표 충족.
// Stage D 에서 상위 100건은 Claude 직접 작성으로 5,000자+ 추가 강화 예정.
const MIN_CONTENT_LEN = 1250;
const MIN_ELIGIBILITY_LEN = 60;
const MIN_APPLY_METHOD_LEN = 60;
const MIN_DOCS_LEN = 40;
const MIN_EXCERPT_LEN = 70;
const MIN_FAQS_COUNT = 5;
const MIN_FOCUS_KEYWORD_REPEAT = 3; // content 내 focusKeyword 등장 최소 횟수

export type PolicyInput = {
  title: string;
  category?: string | null;
  geoRegion?: string | null;
  description?: string | null;
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  requiredDocuments?: string | null;
  deadline?: string | null;
  applyUrl?: string | null;
};

export type GeneratedContent = {
  excerpt: string;          // 100~200자 한 문단 요약
  content: string;           // HTML 본문 (h2/p/ul/ol/table + callout/steps/cta-apply)
  eligibility: string;       // 지원 대상 (불릿 5개 이상, 200자 이상)
  applicationMethod: string; // 신청 방법 단계별 (5단계, 200자 이상)
  requiredDocuments: string; // 필요 서류 (필수/추가 분류)
  metaDesc: string;          // SEO 메타 160자 이내
  focusKeyword: string;      // 2~3단어
  faqs: { question: string; answer: string }[]; // 6~8개
};

function buildSystemPrompt(): string {
  return `당신은 대한민국 정부 복지·지원금·환급금 정보를 일반 시민에게 친절하게 안내하는 정책 전문 에디터입니다.
지원금길잡이(govmate.co.kr)에 게재될 정책 본문을 작성합니다. 우리 사이트는 정부 정책·환급금·지원금을 알려주는 정보 플랫폼입니다.

[작성 원칙 — 반드시 지킬 것]
1. 원본 데이터에 있는 구체 수치·기간·자격은 그대로 인용. 없는 구체 수치는 지어내지 않습니다.
2. 불확실한 구체 수치는 "자세한 내용은 담당 기관 공고를 확인하세요"로 대체합니다.
3. 단, **원본이 빈약할 때**(예: 정책명·지역·카테고리만 있는 경우)는 해당 카테고리(아동수당·근로장려금·바우처 등)의 일반적인 신청 흐름·필요 서류·자주 묻는 질문·지급 후 활용 가이드·생활 팁 등 **보편적이고 정확한 일반 안내**로 분량을 충분히 채워도 됩니다. 이때는 "일반적으로", "보통", "대부분의 지자체에서" 같은 완곡 표현을 사용하고 끝부분에 "구체 일정·금액은 해당 기관 공고를 확인하세요"라고 명시합니다.
4. 국민이 "내가 해당되는지·어떻게 받는지"를 3초 안에 파악할 수 있도록 명료하게 작성합니다.
5. 문체는 "~입니다/~세요" 존댓말, 친근하고 따뜻하게.
6. 광고·과장 표현 금지: "최고", "반드시 받으세요", "100% 보장" 같은 어휘 회피.
7. 각 H2 섹션은 **최소 250자 이상**, 9개 섹션 합계 **2,500자 이상**이 정상 분량입니다. 짧게 끝내지 말고 충분히 풀어 작성하세요.

[중복 방지 — 매우 중요]
페이지 컴포넌트가 이미 \"상세 설명\", \"지원 대상\", \"신청 방법\", \"필요 서류\", \"자주 묻는 질문\", \"관련 정책\" H2를 자동으로 추가합니다.
- content 필드(=상세 설명 박스 안): 아래 4개 H2만. \"지원 대상\"·\"신청 방법\"·\"제출 서류\"·\"자주 묻는 질문\"·\"함께 보면 좋은 정책\" H2는 절대 넣지 마세요(중복).
- eligibility/applicationMethod/requiredDocuments 필드: HTML 안에 H2를 넣지 마세요(페이지가 자동 추가). 콘텐츠만 ul/ol/p로.

[content 본문 4섹션 구조]
1) <div class=\"callout callout-info\"><ul>...</ul></div> — 시행기관/지원대상/지원금액/신청기간/처리기간 정보. <strong>제목 라벨 사용 금지</strong>(\"정책 한눈에 보기\" 같은 헤더 텍스트 X). 바로 ul 시작.
2) <h2>지원 내용</h2> — 4~6문장 + 표(<table class=\"policy-table\">) 또는 불릿. em-dash 금지, 짧은 명사형 H2.
3) <h2>신청 후 처리 절차</h2> — 심사 / 결과 통보 / 지급 / 사후관리 단계별 (각 단계 소요일/주체)
4) <h2>출처 및 참고</h2> — 부처명, 시행 연도, 공식 신청처(applyUrl 그대로), 마지막 업데이트 YYYY년 X월

[eligibility 필드 — H2 없이, 콜론 라벨 없이, ul 한 덩어리만]
<ul><li>✅ 만 19~34세 (군 복무 시 최대 만 39세)</li><li>✅ 서울특별시 1년 이상 계속 거주</li>...</ul>
중요: <strong>...:</strong> 콜론 라벨 사용 금지. 자연 문장으로. ul 뒤에 추가 <p> 안내 금지(줄간격 큼). ul 한 블록만.

[applicationMethod 필드 — H2 없이, 콜론 라벨 없이]
<ol class=\"steps\"><li>1단계. 서울청년포털에 회원가입 후 ...</li><li>2단계. ...</li>...</ol>
중요: <strong>1단계.</strong> 처럼 strong 사용 금지. 자연 문장. \"1단계.\" 또는 \"①\" 마커만.

[requiredDocuments 필드 — H2 없이, 줄바꿈 없이 한 단락]
<p>신분증 사본, 주민등록등본, 건강보험 자격득실확인서 ... 등을 기본 제출합니다. 본인 상황에 따라 근로계약서·소득증빙·군 복무 사실 증명서 등을 추가합니다. 모든 서류는 정부24·국민건강보험공단·홈택스·병무청에서 온라인 무료 발급이 가능합니다.</p>
중요 금지사항:
- <strong>필수:</strong>·<strong>해당 시:</strong> 콜론 라벨 사용 금지
- ul 사용 금지
- \"필요 서류는 다음과 같습니다\", \"제출 서류는 ~입니다\" 같은 redundant 도입부 문장 금지(페이지가 이미 \"필요 서류\" H2를 자동 표시함)
- 그냥 첫 단어부터 서류 이름을 나열하는 자연 문장으로.

[글자 수 / 키워드 / 행동유도 — 필수]
- content 필드 본문(HTML 태그 제외 평문 기준)은 **2,500자 이상 3,500자 이하**가 목표 분량입니다. 절대 1,500자 미만으로 끝내지 마세요.
- content 분량은 faqs/eligibility/applicationMethod/requiredDocuments 와 별개입니다. content 만 단독으로 2,500자+ 가 정상.
- 9개 H2 섹션 각각이 최소 평문 250자 이상이어야 합산 2,500자에 도달합니다. 짧은 섹션 발견 시 풀어 작성하세요.
- focusKeyword(예: "근로장려금")는 본문 내 **5회 이상** 자연스럽게 노출.
- 행동유도 키워드 — "신청", "조회", "자격 확인", "지급" — 본문 내 합계 **5회 이상** 자연 포함.
- 모든 H2 첫 줄에 1~2문장 핵심 요약(두괄식). AI 답변 엔진이 발췌하기 좋도록.
- 숫자는 "5,000,000원" 보다 "500만 원" 형식 우선.
- GEO 신뢰성: 부처명("보건복지부", "고용노동부", "국세청" 등) + 시행 연도 + 마지막 업데이트 일자(YYYY년 X월 기준) 반드시 표기.

[허용 HTML 태그 화이트리스트]
<h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>,
<div class="callout callout-info">, <div class="callout callout-warn">, <div class="callout callout-success">,
<a class="cta-apply"> (신청 버튼 1~2개), <ol class="steps"> (단계 카드)
금지: <script>, <style>, 인라인 스타일(style=""), onClick·onLoad 등 이벤트 핸들러, <img>(텍스트 위주)

[FAQ — faqs 배열에 6~8개]
- 각 질문은 검색 의도 명확("월 70만 원을 다 납입해야 하나요?", "중복 신청 가능한가요?")
- 각 답변은 1~3문장, 핵심 답을 첫 문장에.

[출력 형식]
반드시 JSON 객체 하나만 반환. 다른 텍스트, 마크다운 펜스 금지.`;
}

function buildUserPrompt(p: PolicyInput): string {
  const parts: string[] = [];
  parts.push(`[원본 데이터]`);
  parts.push(`제목: ${p.title}`);
  if (p.category) parts.push(`카테고리: ${p.category}`);
  if (p.geoRegion) parts.push(`지역: ${p.geoRegion}`);
  if (p.deadline) parts.push(`마감/신청기간: ${p.deadline}`);
  if (p.description) parts.push(`설명: ${p.description.slice(0, 1500)}`);
  if (p.content) parts.push(`본문원문: ${p.content.slice(0, 2000)}`);
  if (p.eligibility) parts.push(`지원대상(원문): ${p.eligibility.slice(0, 1000)}`);
  if (p.applicationMethod)
    parts.push(`신청방법(원문): ${p.applicationMethod.slice(0, 1000)}`);
  if (p.requiredDocuments)
    parts.push(`필요서류(원문): ${p.requiredDocuments.slice(0, 800)}`);
  if (p.applyUrl) parts.push(`공식 신청링크: ${p.applyUrl}`);

  parts.push(`
[작성 요청]
위 원본 데이터를 바탕으로 다음 JSON 스키마를 채워 반환하세요.
원본에 없는 정보는 지어내지 말고 일반적인 안내("자세한 내용은 담당 기관 공고를 확인하세요")로 대체합니다.
본문은 9-섹션 표준 구조를 모두 포함해야 합니다.

{
  "excerpt": "100~200자 한 문단 요약. 첫 문장에 핵심 혜택과 대상 포함. 마침표 포함.",
  "content": "HTML 본문 2,500~3,500자. 9개 H2 섹션 모두 포함. callout/steps/cta-apply 클래스 활용. focusKeyword 5회 이상 자연 노출. 행동유도 키워드(신청·조회·자격 확인·지급) 합계 5회 이상.",
  "eligibility": "지원 대상 200자 이상. 불릿 5개 이상 또는 줄바꿈으로 구분. 연령·소득·지역·가구 조건 명시.",
  "applicationMethod": "신청 방법 200자 이상. 5단계 번호 절차로 단계별 안내. 온라인/방문/우편 구분.",
  "requiredDocuments": "필요 서류 100자 이상. 필수/추가 분류. 발급처(정부24·홈택스 등) 명시. 원문이 없으면 일반적인 신청서·신분증·소득증빙·통장사본 등 보편 안내.",
  "metaDesc": "구글 검색 결과에 노출될 160자 이내 설명. 핵심 혜택 + 대상 + focusKeyword + 행동유도 1개 포함.",
  "focusKeyword": "2~3단어 핵심 검색어 (예: '근로장려금 신청', '에너지바우처 자격')",
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}

faqs 는 6~8개. 검색 의도가 명확한 질문 + 1~3문장의 핵심 답변.`);

  return parts.join('\n');
}

/** HTML 안전화 — script/style/inline-style/이벤트 핸들러 제거 */
function sanitizeHtml(html: string): string {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, '')
    .replace(/\sstyle\s*=\s*'[^']*'/gi, '');
}

/** content 내 키워드 등장 횟수 (대소문자/공백 정규화) */
function countOccurrences(haystack: string, needle: string): number {
  if (!needle || !haystack) return 0;
  const text = haystack.toLowerCase();
  const key = needle.toLowerCase().trim();
  if (key.length === 0) return 0;
  // 단순 글로벌 매칭
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = text.match(new RegExp(escaped, 'g'));
  return matches ? matches.length : 0;
}

/** content 평문 길이 (HTML 태그 제거) */
function plainLen(html: string): number {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
}

/**
 * JSON 응답 유효성 검증.
 * 통과 못하면 null 반환 (호출자가 재시도 트리거).
 */
function validate(obj: unknown): GeneratedContent | null {
  const debug = process.env.GEN_DEBUG === '1';
  const fail = (reason: string): null => {
    if (debug) console.warn(`  [validate fail] ${reason}`);
    return null;
  };

  if (!obj || typeof obj !== 'object') return fail('not object');
  const o = obj as Record<string, unknown>;

  const required = [
    'excerpt',
    'content',
    'eligibility',
    'applicationMethod',
    'requiredDocuments',
    'metaDesc',
    'focusKeyword',
    'faqs',
  ];
  for (const f of required) {
    if (!(f in o)) return fail(`missing field: ${f}`);
  }
  if (!Array.isArray(o.faqs)) return fail('faqs not array');

  const content = typeof o.content === 'string' ? o.content : '';
  const excerpt = typeof o.excerpt === 'string' ? o.excerpt : '';
  const eligibility = typeof o.eligibility === 'string' ? o.eligibility : '';
  const applicationMethod = typeof o.applicationMethod === 'string' ? o.applicationMethod : '';
  const requiredDocuments = typeof o.requiredDocuments === 'string' ? o.requiredDocuments : '';
  const focusKeyword = typeof o.focusKeyword === 'string' ? o.focusKeyword : '';

  // 길이 가드 — 본문은 평문 기준으로 측정 (HTML 태그 제외)
  const cLen = plainLen(content);
  if (cLen < MIN_CONTENT_LEN) return fail(`content plain ${cLen} < ${MIN_CONTENT_LEN}`);
  if (excerpt.length < MIN_EXCERPT_LEN)
    return fail(`excerpt ${excerpt.length} < ${MIN_EXCERPT_LEN}`);
  if (eligibility.length < MIN_ELIGIBILITY_LEN)
    return fail(`eligibility ${eligibility.length} < ${MIN_ELIGIBILITY_LEN}`);
  if (applicationMethod.length < MIN_APPLY_METHOD_LEN)
    return fail(`applicationMethod ${applicationMethod.length} < ${MIN_APPLY_METHOD_LEN}`);
  if (requiredDocuments.length < MIN_DOCS_LEN)
    return fail(`requiredDocuments ${requiredDocuments.length} < ${MIN_DOCS_LEN}`);

  // FAQ 개수 가드
  const faqsArr = (o.faqs as unknown[])
    .filter(
      (f): f is { question: string; answer: string } =>
        !!f && typeof f === 'object' &&
        typeof (f as { question?: unknown }).question === 'string' &&
        typeof (f as { answer?: unknown }).answer === 'string',
    )
    .map((f) => ({
      question: String(f.question).slice(0, 200),
      answer: String(f.answer).slice(0, 800),
    }));
  if (faqsArr.length < MIN_FAQS_COUNT)
    return fail(`faqs ${faqsArr.length} < ${MIN_FAQS_COUNT}`);

  // focusKeyword 본문 등장 횟수
  // - 긴 구(예: "경북 아동수당 신청")는 본문에 그대로 안 나오는 게 정상.
  // - 가장 긴 핵심 명사(예: "아동수당") 또는 전체 구가 합쳐서 임계 횟수 등장하면 통과.
  if (focusKeyword.trim().length === 0) return fail('focusKeyword empty');
  const tokens = focusKeyword
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const longest = tokens.sort((a, b) => b.length - a.length)[0] || focusKeyword;
  const kwHits =
    countOccurrences(content, focusKeyword) + countOccurrences(content, longest);
  if (kwHits < MIN_FOCUS_KEYWORD_REPEAT)
    return fail(
      `focusKeyword "${focusKeyword}" / longest "${longest}" hits ${kwHits} < ${MIN_FOCUS_KEYWORD_REPEAT}`,
    );

  return {
    excerpt: excerpt.slice(0, 220),
    content: sanitizeHtml(content).slice(0, 12000),
    eligibility: eligibility.slice(0, 3000),
    applicationMethod: applicationMethod.slice(0, 3000),
    requiredDocuments: requiredDocuments.slice(0, 2000),
    metaDesc: String(o.metaDesc ?? '').slice(0, 170),
    focusKeyword: focusKeyword.slice(0, 60),
    faqs: faqsArr.slice(0, 8),
  };
}

/**
 * Phase 1 — 본문 HTML 만 생성 (메타·FAQ 제외).
 * JSON 모드 끄고 long-form HTML 으로 토큰 예산 전체를 본문에 집중.
 */
async function generateBodyOnly(
  p: PolicyInput,
  temperature: number,
  retryHint?: string,
): Promise<string | null> {
  const sysParts: string[] = [];
  sysParts.push(buildSystemPrompt());
  sysParts.push(`
[이번 호출의 출력 범위 — 매우 중요]
이번 응답에는 **HTML 본문만** 출력합니다. JSON·메타데이터·FAQ 는 절대 포함하지 않습니다.
9개 H2 섹션을 모두 갖춘 HTML 본문 한 덩어리만 출력. 응답 시작은 <h2> 로, 끝은 </p> 등 마지막 태그로.
**평문 글자 수(HTML 태그 제외) 2,500~3,500자**가 목표. 1,500자 미만 절대 금지.
각 H2 섹션은 250자 이상으로 충분히 풀어 작성.`);
  if (retryHint) sysParts.push(`\n[재시도 힌트]\n${retryHint}`);

  const userParts: string[] = [];
  userParts.push(`[원본 데이터]`);
  userParts.push(`제목: ${p.title}`);
  if (p.category) userParts.push(`카테고리: ${p.category}`);
  if (p.geoRegion) userParts.push(`지역: ${p.geoRegion}`);
  if (p.deadline) userParts.push(`마감/신청기간: ${p.deadline}`);
  if (p.description) userParts.push(`설명: ${p.description.slice(0, 1500)}`);
  if (p.content) userParts.push(`본문원문: ${p.content.slice(0, 2000)}`);
  if (p.eligibility) userParts.push(`지원대상(원문): ${p.eligibility.slice(0, 1000)}`);
  if (p.applicationMethod)
    userParts.push(`신청방법(원문): ${p.applicationMethod.slice(0, 1000)}`);
  if (p.requiredDocuments)
    userParts.push(`필요서류(원문): ${p.requiredDocuments.slice(0, 800)}`);
  if (p.applyUrl) userParts.push(`공식 신청링크: ${p.applyUrl}`);
  userParts.push(`
[작성 요청]
9-섹션 표준 구조의 HTML 본문만 출력하세요.
- 시작: <h2>정책 한눈에 보기</h2>
- 끝: <h2>함께 보면 좋은 정책</h2> 의 마지막 단락
- focusKeyword(정책 핵심어)는 5회 이상 자연 노출
- 행동유도 키워드(신청·조회·자격 확인·지급) 합계 5회 이상
- 평문 2,500~3,500자
JSON 출력 금지. HTML 만.`);

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: sysParts.join('\n') },
      { role: 'user', content: userParts.join('\n') },
    ],
  });

  const choice = completion.choices[0];
  const text = choice?.message?.content || '';
  if (process.env.GEN_DEBUG === '1') {
    console.warn(
      `  [llm body] finish=${choice?.finish_reason} usage=in${completion.usage?.prompt_tokens}/out${completion.usage?.completion_tokens} chars=${text.length} plain=${plainLen(text)}`,
    );
  }
  // 모델이 마크다운 펜스로 감쌀 수 있어 제거
  const cleaned = text
    .replace(/^```(?:html|HTML)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return cleaned || null;
}

/**
 * Phase 2 — 본문 HTML + 원본 데이터로부터 메타·FAQ 만 JSON 으로 추출.
 */
type MetaFields = {
  excerpt: string;
  eligibility: string;
  applicationMethod: string;
  requiredDocuments: string;
  metaDesc: string;
  focusKeyword: string;
  faqs: { question: string; answer: string }[];
};

async function generateMetaFromBody(
  p: PolicyInput,
  bodyHtml: string,
  temperature: number,
): Promise<MetaFields | null> {
  const sys = `당신은 정책 본문 HTML 을 분석해 SEO/AEO 메타데이터와 FAQ 를 추출하는 어시스턴트입니다.
HTML 안에 있는 사실만 사용해 정확하게 요약/추출합니다.
반드시 JSON 객체 하나만 반환합니다.`;

  const user = `[원본 정책 데이터]
제목: ${p.title}
카테고리: ${p.category || ''}
지역: ${p.geoRegion || ''}
신청링크: ${p.applyUrl || ''}

[본문 HTML]
${bodyHtml}

[추출 요청 — 다음 JSON 스키마로 정확히 반환]
중요: 각 필드 분량 하한을 반드시 지키세요. 너무 짧으면 검증 실패.
{
  "excerpt": "100~200자 한 문단 요약. 첫 문장에 핵심 혜택과 대상 포함. 마침표 포함.",
  "eligibility": "지원 대상 — 최소 150자 이상, 권장 200자. 연령·소득·지역·가구 조건을 줄바꿈/불릿으로 명확히 나열. 본문에서 추출하거나 부족하면 카테고리 일반 조건으로 보강.",
  "applicationMethod": "신청 방법 — 최소 150자 이상, 권장 200자. 5단계 절차로 단계별 안내. 온라인/방문/우편 구분 + 각 단계의 핵심 행동.",
  "requiredDocuments": "필요 서류 — 최소 80자 이상. 필수/추가 분류. 발급처(정부24·홈택스 등) 명시.",
  "metaDesc": "구글 검색 결과용 160자 이내. 핵심 혜택 + 대상 + focusKeyword + 행동유도 1개 포함.",
  "focusKeyword": "2~3단어 핵심 검색어 (예: '근로장려금 신청')",
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}

faqs 는 6~8개. 검색 의도가 명확한 질문 + 1~3문장의 핵심 답변. 본문에서 도출하거나 보편적 질문으로 보강.`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
  });

  const choice = completion.choices[0];
  const raw = choice?.message?.content || '';
  if (process.env.GEN_DEBUG === '1') {
    console.warn(
      `  [llm meta] finish=${choice?.finish_reason} usage=in${completion.usage?.prompt_tokens}/out${completion.usage?.completion_tokens}`,
    );
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if (!Array.isArray(o.faqs)) return null;

  const faqs = (o.faqs as unknown[])
    .filter(
      (f): f is { question: string; answer: string } =>
        !!f && typeof f === 'object' &&
        typeof (f as { question?: unknown }).question === 'string' &&
        typeof (f as { answer?: unknown }).answer === 'string',
    )
    .map((f) => ({
      question: String(f.question).slice(0, 200),
      answer: String(f.answer).slice(0, 800),
    }));

  return {
    excerpt: String(o.excerpt ?? ''),
    eligibility: String(o.eligibility ?? ''),
    applicationMethod: String(o.applicationMethod ?? ''),
    requiredDocuments: String(o.requiredDocuments ?? ''),
    metaDesc: String(o.metaDesc ?? ''),
    focusKeyword: String(o.focusKeyword ?? ''),
    faqs,
  };
}

/**
 * 정책 하나에 대해 2단계 LLM 호출로 본문 + 메타·FAQ 생성.
 * Phase 1: 본문 HTML 단독 생성 (분량 집중)
 * Phase 2: 본문에서 메타·FAQ 추출 (JSON 구조화)
 *
 * @returns GeneratedContent 또는 null (검증 실패 시)
 * @throws OpenAI API 호출 실패 시 에러 전파
 */
export async function generatePolicyContent(
  p: PolicyInput,
): Promise<GeneratedContent | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  // Phase 1: 본문 — 최대 3회 시도, 가장 긴 본문을 유지
  let bestBody: string | null = null;
  let bestLen = 0;
  const attempts: Array<{ temp: number; hint?: string }> = [
    { temp: TEMPERATURE_PRIMARY },
    {
      temp: TEMPERATURE_RETRY,
      hint: `이전 시도의 본문 평문이 ${MIN_CONTENT_LEN}자에 못 미쳤습니다. 이번에는 반드시 평문 ${MIN_CONTENT_LEN}자 이상으로 작성합니다. 각 H2 섹션을 4~6개 단락으로 풀어 쓰고, 원본 데이터가 부족하면 정책 카테고리 일반 안내·신청 흐름·생활 팁·관련 제도 안내로 충분히 채우세요.`,
    },
    {
      temp: TEMPERATURE_RETRY,
      hint: `한 번 더 시도합니다. 직전 시도도 분량이 모자랐습니다. 이번 응답에서는 출력 토큰 1,800개 이상 사용해서 9-섹션을 모두 길고 풍부하게 작성하세요. 짧게 끝내지 말고, 각 섹션마다 구체적 예시·자주 묻는 질문·실제 신청 시 주의점·지급 후 활용 가이드를 추가하세요. 평문 ${MIN_CONTENT_LEN}자 이상은 절대 양보 불가.`,
    },
  ];
  for (const a of attempts) {
    const body = await generateBodyOnly(p, a.temp, a.hint);
    if (!body) continue;
    const len = plainLen(body);
    if (len > bestLen) {
      bestBody = body;
      bestLen = len;
    }
    if (len >= MIN_CONTENT_LEN) break; // 충분 → 더 시도하지 않음
  }
  if (!bestBody) return null;
  const bodyClean = sanitizeHtml(bestBody);

  // Phase 2: 메타 + FAQ
  const meta = await generateMetaFromBody(p, bodyClean, TEMPERATURE_PRIMARY);
  if (!meta) return null;

  // 통합 후 검증 (validate 가 모든 가드 처리)
  const merged = {
    excerpt: meta.excerpt,
    content: bodyClean,
    eligibility: meta.eligibility,
    applicationMethod: meta.applicationMethod,
    requiredDocuments: meta.requiredDocuments,
    metaDesc: meta.metaDesc,
    focusKeyword: meta.focusKeyword,
    faqs: meta.faqs,
  };
  return validate(merged);
}

// 페이지가 자동 추가하는 H2와 중복되는 섹션이 content 본문에 들어가 있는지 감지.
// 잘못된 9-섹션 구조로 만든 본문을 재처리 대상으로 만들기 위함.
const DUPLICATE_H2_PATTERN =
  /<h2[^>]*>\s*(지원\s*대상|신청\s*방법|제출\s*서류|필요\s*서류|자주\s*묻는\s*질문|함께\s*보면)/i;

// 옛 형식 — callout 안의 \"정책 한눈에 보기\" 헤더 라벨
const OLD_CALLOUT_LABEL_PATTERN = /<strong>\s*정책\s*한눈에\s*보기/;

// 옛 형식 — `<strong>연령:</strong>` `<strong>거주요건:</strong>` 같은 콜론 라벨
const COLON_LABEL_PATTERN = /<strong>[가-힣\s]{1,15}:<\/strong>/;

export function hasDuplicateSectionH2(content?: string | null): boolean {
  if (!content) return false;
  return DUPLICATE_H2_PATTERN.test(content);
}

export function hasOldFormatMarkers(p: {
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  requiredDocuments?: string | null;
}): boolean {
  if (p.content && OLD_CALLOUT_LABEL_PATTERN.test(p.content)) return true;
  if (p.eligibility && COLON_LABEL_PATTERN.test(p.eligibility)) return true;
  if (p.applicationMethod && COLON_LABEL_PATTERN.test(p.applicationMethod))
    return true;
  if (p.requiredDocuments && COLON_LABEL_PATTERN.test(p.requiredDocuments))
    return true;
  return false;
}

/**
 * 특정 정책이 LLM 확장이 필요한지 판단.
 * AdSense 풍부화 기준 + 새 4섹션 구조로 마이그레이션 필요 여부.
 *   - content 평문 < 1500자
 *   - content에 중복 H2(지원 대상/신청 방법/제출 서류/FAQ/함께 보면) 포함 시 재처리
 *   - eligibility < 100자, applicationMethod < 100자, excerpt < 80자
 *   - metaDesc 누락, focusKeyword 누락
 */
export function needsGeneration(p: {
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  excerpt?: string | null;
  metaDesc?: string | null;
  focusKeyword?: string | null;
}): boolean {
  const contentLen = (p.content || '').replace(/<[^>]+>/g, '').trim().length;
  if (contentLen < MIN_CONTENT_LEN) return true;
  // 중복 H2 패턴 → 옛 9-섹션 구조 → 새 4섹션 구조로 재작성 필요
  if (hasDuplicateSectionH2(p.content)) return true;
  // 옛 콜론 라벨/callout 헤더 → 새 자연 문장 형식으로 재작성 필요
  if (hasOldFormatMarkers(p)) return true;
  if (!p.eligibility || p.eligibility.trim().length < MIN_ELIGIBILITY_LEN)
    return true;
  if (
    !p.applicationMethod ||
    p.applicationMethod.trim().length < MIN_APPLY_METHOD_LEN
  )
    return true;
  if (!p.excerpt || p.excerpt.trim().length < MIN_EXCERPT_LEN) return true;
  if (!p.metaDesc || p.metaDesc.trim().length < 50) return true;
  if (!p.focusKeyword || p.focusKeyword.trim().length < 2) return true;
  return false;
}

/** 외부에서 임계값을 참조할 수 있도록 export */
export const CONTENT_THRESHOLDS = {
  MIN_CONTENT_LEN,
  MIN_ELIGIBILITY_LEN,
  MIN_APPLY_METHOD_LEN,
  MIN_DOCS_LEN,
  MIN_EXCERPT_LEN,
  MIN_FAQS_COUNT,
  MIN_FOCUS_KEYWORD_REPEAT,
} as const;
