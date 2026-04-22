/**
 * lib/markdown-safe.ts
 * ------------------------------------------------------------------
 * policy.content / description 같은 DB 저장 문자열이
 * HTML 위주로 오지만 가끔 AI 생성 요약이 섞이면서 raw `**`, `#` 같은
 * markdown 마커가 literal 로 렌더링되는 문제를 방지하는 경량 전처리.
 *
 * 외부 라이브러리 없이(Next.js Edge/Serverless 번들 경량화 유지):
 *   - HTML 태그가 포함되어 있으면:  markdown 마커만 HTML 로 치환
 *   - HTML 태그가 없으면:  줄바꿈 + 굵게/헤딩만 최소 변환
 *
 * 주의:
 *   TipTap 편집기가 저장한 정상 HTML 은 변경하지 않는다.
 *   전체 마크다운 파서가 필요하면 marked/remark 도입을 검토하세요.
 */

/** HTML 태그 포함 여부 (block-level 태그 기준) */
function hasHtml(s: string): boolean {
  return /<\s*(p|div|h[1-6]|ul|ol|li|table|br|strong|em|a|img|span)\b/i.test(s);
}

/**
 * 안전 전처리: 이미 HTML 이면 markdown 마커만 제거, 아니면 최소 markdown→HTML.
 */
export function normalizePolicyHtml(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);

  if (hasHtml(s)) {
    // HTML 내부에 섞여 있는 raw markdown 마커만 정리
    //   **text**  → <strong>text</strong>
    //   행 시작 # Heading → <h3>Heading</h3>
    s = s.replace(/\*\*([^*\n<>]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|\n)[ \t]*#{1,3}[ \t]+([^\n<]+)/g, (_m, pre: string, h: string) => `${pre}<h3>${h.trim()}</h3>`);
    return s;
  }

  // 순수 텍스트 → 최소 markdown 변환
  s = s
    // 코드 블록 제거(간단)
    .replace(/```[\s\S]*?```/g, (b) => b.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, ''))
    // 굵게
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    // 헤딩
    .replace(/^[ \t]{0,3}#{1,3}[ \t]+(.+)$/gm, '<h3>$1</h3>')
    // 리스트
    .replace(/^[ \t]*[-*+][ \t]+(.+)$/gm, '<li>$1</li>')
    // 단락
    .split(/\n\s*\n/)
    .map((p) => (p.startsWith('<') ? p : `<p>${p.replace(/\n/g, '<br>')}</p>`))
    .join('\n');

  // 연속된 <li> 를 <ul> 로 감싸기
  s = s.replace(/(<li>[\s\S]*?<\/li>\s*)+/g, (m) => `<ul>${m}</ul>`);

  return s;
}
