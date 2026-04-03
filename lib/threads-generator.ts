import OpenAI from 'openai'
import type { Format } from './rl-engine'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Persona DNA — govhelp.co.kr 스타일 역분석
const PERSONA = `
말투: 캐주얼하고 정보성 있으며 약간 장난기 있음
문장: 짧게 끊어서 가독성 높임 (매 문장 줄바꿈)
시그니처 문구: "~하는게 핵심이야", "~하면 낫지 않나?", "~하는게 낫지 않을까?"
이모지: ✅ 🔥 💸 😅 🙋 중에서 자연스럽게 1~3개
글자수: 450자 이내
`

const FORMAT_PROMPTS: Record<Format, string> = {
  checklist: `
체크리스트 형식으로 작성하세요.

형식:
[훅 한 줄 - "이 조건 다 해당되면 무조건 신청해야 함" 스타일]

✅ [조건1 - 구체적 수치 포함]
✅ [조건2]
✅ [조건3]
...
↓ 해당되면 [금액/혜택] 받을 수 있어!

[신청 링크 유도 한 줄]
`,

  qa: `
Q&A 형식으로 작성하세요.

형식:
Q: [가장 궁금할 법한 질문] 🤔
A: [명확한 답변 2~3줄]

[핵심 혜택 한 줄]
신청: ↓ [CTA]
`,

  story: `
공감형 스토리텔링으로 작성하세요.

형식:
[공감 포인트 훅 - "어머, 벌써 ~" / "나도 혹시~" 스타일]
[상황 공감 1~2줄]
[그런데 이런 지원금이 있다는 것]
[혜택 핵심 - 금액 포함]
[마감/기간 압박 한 줄]
신청: ↓ [CTA]
`,

  number: `
숫자 강조형으로 작성하세요.

형식:
[큰 숫자로 시작 - "최대 OO만원!"]

1. [혜택1] → [금액/수치]
2. [혜택2] → [금액/수치]
3. [혜택3] → [금액/수치]

↓ [신청 CTA]
`,

  compilation: `
여러 정책 묶음 형식으로 작성하세요.

형식:
[훅 - "신청 안 하면 후회할걸?" / "지금 놓치면 진짜 손해"]

1. [정책명] - [혜택 한 줄]
2. [정책명] - [혜택 한 줄]
3. [정책명] - [혜택 한 줄]

↓ 각 신청 링크
`,

  cardnews: `
카드뉴스 캡션 형식으로 작성하세요.

형식:
[강렬한 한 줄 제목]

📌 핵심만 정리:
· [포인트1]
· [포인트2]
· [포인트3]

📎 자세히 보기 → [링크]
`,
}

export async function generateThreadsPost(
  policy: { title: string; content: string; applyUrl?: string },
  format: Format
): Promise<string> {
  const prompt = `
정책 정보:
제목: ${policy.title}
내용: ${policy.content.slice(0, 1000)}
신청 URL: ${policy.applyUrl ?? '정부24 또는 복지로'}

${FORMAT_PROMPTS[format]}

페르소나:
${PERSONA}
`
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '당신은 대한민국 정부 지원금 정보를 SNS에서 바이럴하게 전달하는 전문가입니다. 30~50대가 공감하는 언어로 씁니다.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 600,
    temperature: 0.85,
  })

  return res.choices[0].message.content ?? ''
}
