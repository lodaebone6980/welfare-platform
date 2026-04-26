/**
 * lib/policy-content-generator.ts
 * ------------------------------------------------------------------
 * LLM(OpenAI gpt-4o-mini) 기반 정책 본문 자동 생성.
 *
 * 목적:
 *   API(복지로/공공데이터포털 등)로 수집된 정책은 제목만 있거나 설명이 부실한
 *   경우가 많음 → 구글 인덱싱·AEO·사용자 가독성을 모두 저해.
 *   원본 데이터를 **확장·재구성**해서 완성된 글로 만들어 주는 역할.
 *
 * 설계 원칙:
 *   1) 환각 방지 — 원본에 없는 수치/자격/기간은 절대 지어내지 않는다.
 *      불확실한 부분은 "자세한 내용은 담당 기관 확인" 류로 유도한다.
 *   2) 구조화 — 제목/요약/대상/방법/서류/FAQ 가 동일 JSON 스키마로 나옴
 *      → DB 에 그대로 매핑 가능.
 *   3) SEO + AEO — Q&A 섹션을 반드시 포함해 구글 리치 결과 + LLM 답변 엔진
 *      모두에 대응.
 *   4) 비용 가드 — gpt-4o-mini 고정, max_tokens 제한, 정책당 1회 호출.
 *
 * 실패 모드:
 *   - JSON 파싱 실패 / 필드 누락 → null 반환, 호출자는 skip
 *   - OpenAI API 오류 → throw, 호출자가 캐치 후 로그
 */

import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = 'gpt-4o-mini';
const TEMPERATURE = 0.4;
const MAX_TOKENS = 2000;

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
  excerpt: string;          // 80자 이내 한 문장 요약
  content: string;           // HTML 본문 (h2/p/ul)
  eligibility: string;       // 지원 대상 (자연어 + 불릿)
  applicationMethod: string; // 신청 방법 단계별
  requiredDocuments: string; // 필요 서류
  metaDesc: string;          // SEO 메타 150자 이내
  focusKeyword: string;      // 2~3단어
  faqs: { question: string; answer: string }[]; // 3~5개
};

function buildSystemPrompt(): string {
  return `당신은 대한민국 정부 복지 정책을 일반 시민에게 쉽게 안내하는 전문 작가입니다.

작성 원칙:
1. 원본 데이터에 있는 사실만 재구성합니다. 없는 정보는 지어내지 않습니다.
2. 불확실한 구체 수치/기간/자격은 "자세한 내용은 담당 기관 공고를 확인하세요"로 대체합니다.
3. 국민이 "내가 해당되는지/어떻게 받는지"를 3초 안에 파악할 수 있도록 명료하게 씁니다.
4. HTML 본문은 <h2>, <p>, <ul><li> 태그만 사용합니다. <script>, <style>, <img>, 인라인 스타일 금지.
5. 문체는 "~입니다/~세요" 존댓말, 딱딱하지 않게.
6. FAQ 는 지원대상/신청방법/필요서류/자주 묻는 질문 중심으로 3~5개.
7. 광고·과장 표현(최고, 최대, 반드시 받으세요 등) 금지.
8. 반드시 JSON 하나만 반환하고 그 외 텍스트는 출력하지 않습니다.`;
}

function buildUserPrompt(p: PolicyInput): string {
  const parts: string[] = [];
  parts.push(`[원본 데이터]`);
  parts.push(`제목: ${p.title}`);
  if (p.category) parts.push(`카테고리: ${p.category}`);
  if (p.geoRegion) parts.push(`지역: ${p.geoRegion}`);
  if (p.deadline) parts.push(`마감: ${p.deadline}`);
  if (p.description) parts.push(`설명: ${p.description.slice(0, 1500)}`);
  if (p.content) parts.push(`본문원문: ${p.content.slice(0, 2000)}`);
  if (p.eligibility) parts.push(`지원대상(원문): ${p.eligibility.slice(0, 1000)}`);
  if (p.applicationMethod)
    parts.push(`신청방법(원문): ${p.applicationMethod.slice(0, 1000)}`);
  if (p.requiredDocuments)
    parts.push(`필요서류(원문): ${p.requiredDocuments.slice(0, 800)}`);
  if (p.applyUrl) parts.push(`신청링크: ${p.applyUrl}`);

  parts.push(`
[작성 요청]
위 원본 데이터를 바탕으로 다음 JSON 스키마를 채워 반환하세요.
원본에 없는 정보는 지어내지 말고 일반적인 안내로 대체하세요.

{
  "excerpt": "80자 이내 한 문장 요약 (마침표 포함)",
  "content": "HTML 본문. <h2>개요</h2><p>…</p><h2>혜택</h2><p>…</p><h2>신청 방법</h2><p>…</p> 형식. 500~1200자.",
  "eligibility": "지원 대상. 불릿 가능. 원문이 있으면 재구성, 없으면 일반 조건 가이드.",
  "applicationMethod": "신청 방법을 단계별로. 온라인/방문/우편 구분.",
  "requiredDocuments": "필요 서류 목록. 원문이 없으면 '담당 기관 공고를 확인하세요' 로 안내.",
  "metaDesc": "구글 검색 결과에 노출될 150자 이내 설명. 핵심 혜택 + 대상 포함.",
  "focusKeyword": "2~3단어 핵심 검색어",
  "faqs": [
    {"question": "…", "answer": "…"},
    {"question": "…", "answer": "…"},
    {"question": "…", "answer": "…"}
  ]
}`);

  return parts.join('\n');
}

/** JSON 응답 유효성 검증 */
function validate(obj: any): GeneratedContent | null {
  if (!obj || typeof obj !== 'object') return null;
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
    if (!(f in obj)) return null;
  }
  if (!Array.isArray(obj.faqs)) return null;
  // 최소 길이 방어
  if (typeof obj.content !== 'string' || obj.content.length < 100) return null;
  if (typeof obj.excerpt !== 'string' || obj.excerpt.length < 10) return null;

  // HTML 안전화 — <script>, 이벤트 핸들러 등 제거
  const safeContent = String(obj.content)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '');

  return {
    excerpt: String(obj.excerpt).slice(0, 200),
    content: safeContent.slice(0, 8000),
    eligibility: String(obj.eligibility).slice(0, 2000),
    applicationMethod: String(obj.applicationMethod).slice(0, 2000),
    requiredDocuments: String(obj.requiredDocuments).slice(0, 1500),
    metaDesc: String(obj.metaDesc).slice(0, 160),
    focusKeyword: String(obj.focusKeyword).slice(0, 60),
    faqs: obj.faqs
      .filter(
        (f: any) =>
          f && typeof f.question === 'string' && typeof f.answer === 'string',
      )
      .slice(0, 6)
      .map((f: any) => ({
        question: String(f.question).slice(0, 200),
        answer: String(f.answer).slice(0, 800),
      })),
  };
}

/**
 * 정책 하나에 대해 LLM 으로 본문 생성.
 * @returns GeneratedContent 또는 null (검증 실패 시)
 * @throws API 호출 실패 시 에러 전파
 */
export async function generatePolicyContent(
  p: PolicyInput,
): Promise<GeneratedContent | null> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(p) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return validate(parsed);
}

/**
 * 특정 정책이 LLM 확장이 필요한지 판단.
 * 기준: content < 200자 또는 eligibility/applicationMethod 공란.
 */
export function needsGeneration(p: {
  content?: string | null;
  eligibility?: string | null;
  applicationMethod?: string | null;
  excerpt?: string | null;
}): boolean {
  const contentLen = (p.content || '').replace(/<[^>]+>/g, '').trim().length;
  if (contentLen < 200) return true;
  if (!p.eligibility || p.eligibility.trim().length < 20) return true;
  if (!p.applicationMethod || p.applicationMethod.trim().length < 20)
    return true;
  if (!p.excerpt || p.excerpt.trim().length < 20) return true;
  return false;
}
