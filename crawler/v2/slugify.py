"""
한글 친화 슬러그 생성기.

Next.js 는 encodeURIComponent 로 한글 슬러그를 안전하게 처리하므로
UTF-8 한글을 그대로 살리고, 위험한 특수문자만 제거합니다.

설계:
- NFKC 정규화 (호환 분해 → 조합)
- 공백/전각공백 → '-'
- [가-힣 A-Za-z0-9 하이픈] 외 문자 제거
- 연속 하이픈 축약 + 양끝 트리밍
- 80자 컷 (Prisma slug 컬럼은 String, 길이 제한은 없지만 URL 가독성 80자)
- 비어있으면 해시 fallback

충돌 회피는 호출부(pg_writer) 에서 `slug + '-' + suffix` 재시도로 처리합니다.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata

_INVALID_RE = re.compile(r"[^\w가-힣\-]+", re.UNICODE)
_SPACE_RE = re.compile(r"[\s\u3000]+")
_DASH_COLLAPSE = re.compile(r"-+")
_LEADING_BRACKETS = re.compile(r"^\s*\[[^\]]*\]\s*")


def slugify_kr(text: str, max_len: int = 80) -> str:
    if not text:
        return _hash_fallback("", 12)

    # 앞부분의 [출처]/[카테고리] 브래킷 제거 — SEO 에 불필요
    cleaned = _LEADING_BRACKETS.sub("", text)

    # NFKC + 소문자 (한글은 소문자화되지 않음)
    normalized = unicodedata.normalize("NFKC", cleaned).strip().lower()

    # 공백 → 하이픈
    with_dash = _SPACE_RE.sub("-", normalized)

    # 허용문자 외 제거
    sanitized = _INVALID_RE.sub("", with_dash)

    # 연속 하이픈 축약
    collapsed = _DASH_COLLAPSE.sub("-", sanitized).strip("-_")

    if not collapsed:
        return _hash_fallback(text, 12)

    truncated = collapsed[:max_len].rstrip("-_")
    if not truncated:
        return _hash_fallback(text, 12)
    return truncated


def uniquify_slug(base: str, tried: set[str]) -> str:
    """이미 쓴 slug 셋(tried)과 겹치면 '-2', '-3' 붙여 반환."""
    if base not in tried:
        return base
    for i in range(2, 100):
        candidate = f"{base}-{i}"[:80]
        if candidate not in tried:
            return candidate
    # 최종 fallback: 해시 접미사
    return (base + "-" + _hash_fallback(base, 6))[:80]


def _hash_fallback(seed: str, length: int) -> str:
    h = hashlib.blake2b(seed.encode("utf-8"), digest_size=8).hexdigest()
    return h[:length]


__all__ = ["slugify_kr", "uniquify_slug"]
