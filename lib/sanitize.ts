/**
 * plain-text sanitize 유틸
 * ------------------------------------------------------------------
 * 파일 위치: lib/sanitize.ts
 *
 * 용도:
 *   - AI가 생성한 텍스트(요약/소개)에서 마크다운 기호를 제거해
 *     plain text로 안전하게 노출할 수 있게 한다.
 *   - 마크다운 렌더러를 쓰는 영역(가이드 블로그 본문)에는 사용하지 말 것.
 *
 * 멱등성: 여러 번 적용해도 결과가 동일해야 함.
 */

/** 단일 문자열에서 마크다운 기호 제거 (plain text 용도) */
export function sanitizePlainText(input: string | null | undefined): string {
  if (input == null) return '';
  let s = String(input);

  // 1) 코드 블록/인라인 코드 → 내용만
  s = s.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, ''),
  );
  s = s.replace(/`([^`\n]+)`/g, '$1');

  // 2) 링크 [text](url) → text
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // 3) 이미지 ![alt](url) → alt
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');

  // 4) 굵게 / 기울임
  //    **text** → text, __text__ → text
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  s = s.replace(/__([^_\n]+)__/g, '$1');
  //    *text* → text (단, **는 이미 위에서 처리)
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2');
  //    _text_ → text
  s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1$2');

  // 5) 헤딩 # ~ ###### → 그냥 텍스트
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');

  // 6) blockquote "> " → "\"…\""
  s = s.replace(/^[ \t]{0,3}>[ \t]?(.*)$/gm, '"$1"');

  // 7) 불릿/번호 리스트 → "· "
  s = s.replace(/^[ \t]*[-*+][ \t]+/gm, '· ');
  s = s.replace(/^[ \t]*\d+\.[ \t]+/gm, '· ');

  // 8) 수평선 --- / *** / ___ → 제거
  s = s.replace(/^[ \t]*(-{3,}|\*{3,}|_{3,})[ \t]*$/gm, '');

  // 9) HTML 태그 제거 (혹시 섞여 들어온 경우)
  s = s.replace(/<\/?[a-z][\s\S]*?>/gi, '');

  // 10) 공백 정리
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.trim();

  return s;
}

/**
 * 객체의 문자열 필드만 재귀적으로 sanitize.
 * (JSON 구조는 유지, 배열/객체 순회)
 */
export function sanitizeDeep<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === 'string') {
    return sanitizePlainText(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDeep(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
