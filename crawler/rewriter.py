import json
from openai import OpenAI
from config import cfg

client = OpenAI(api_key=cfg.openai_key)

SYSTEM = """당신은 대한민국 복지·지원금 정보 전문 블로거입니다.
뉴스 기사를 받아 검색 최적화된 블로그 포스트를 작성합니다.
독자는 30~70대 일반인이므로 쉽고 친근하게 작성합니다."""

TEMPLATE = """
다음 기사를 참고해 블로그 포스트를 작성하세요.

원본 제목: {title}
원본 내용: {text}

## 작성 규칙
1. 제목: "2026년 [지원금명] 신청방법 총정리 (+금액/대상/기간)" 형식
2. 본문 구조 (HTML):
   - <h2>지원 대상</h2>: 조건 불릿 리스트
   - <h2>지원 금액</h2>: 표 또는 목록
   - <h2>신청 방법</h2>: 번호 순서
   - <h2>신청 기간</h2>: 구체적 날짜
   - <h2>자주 묻는 질문</h2>: Q&A 3개 (<details><summary>Q.</summary><p>A.</p></details>)
3. 말미에 신청 버튼:
   <a href="{{신청URL}}" class="cta-button" target="_blank" rel="noopener">지금 신청하기 →</a>
4. 글자 수: 1,500자 이상
5. 맨 아래 출처 링크 포함

JSON 형태로만 반환:
{{
  "title": "SEO 최적화 제목",
  "content": "HTML 본문 전체",
  "excerpt": "140자 이내 요약",
  "tags": ["태그1","태그2","태그3"],
  "category": "카테고리명",
  "apply_url": "신청 공식 URL (모르면 null)",
  "focus_keyword": "핵심 키워드 1개",
  "faqs": [
    {{"q": "질문1", "a": "답변1"}},
    {{"q": "질문2", "a": "답변2"}},
    {{"q": "질문3", "a": "답변3"}}
  ]
}}
"""


def rewrite(article: dict) -> dict | None:
    prompt = TEMPLATE.format(
        title=article["title"],
        text=article["text"][:3000]
    )
    try:
        resp = client.chat.completions.create(
            model=cfg.model,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        data = json.loads(resp.choices[0].message.content)
        data["original_url"] = article["link"]
        data["source"]       = article["source"]
        return data
    except Exception as e:
        print(f"[GPT 오류] {e}")
        return None
