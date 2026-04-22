"""
RSS 소스 lightweight reader.

기존 crawler/fetcher.py 는 WP 전용 + newspaper3k 본문 추출까지 함께 함.
v2 는 일단 "기사 후보 메타 목록" 만 뽑고, 본문은 선택적 후처리(상세 API) 로 커버.
newspaper3k 는 빌드 무거워서 CI cron 에서는 생략하고, 필요 시 추가 옵션으로 활성화.

반환: 공통 dict schema
{
  "source": "보건복지부",
  "title": "...",
  "link": "https://...",
  "published": "Fri, 18 Apr 2026 ..." (optional),
  "summary": "...",
}
"""

from __future__ import annotations

import logging
from typing import Iterable

try:
    import feedparser  # type: ignore
except ImportError as e:  # pragma: no cover
    raise SystemExit(
        "feedparser 가 필요합니다. requirements-v2.txt 를 설치하세요."
    ) from e

log = logging.getLogger(__name__)

DEFAULT_SOURCES: list[tuple[str, str]] = [
    ("보건복지부",    "https://www.mohw.go.kr/react/rss/rss.jsp"),
    ("고용노동부",    "https://www.moel.go.kr/rss/news.rss"),
    ("정책브리핑",    "https://www.korea.kr/rss/news.xml"),
    ("연합뉴스경제",  "https://www.yna.co.kr/rss/economy.xml"),
    ("뉴시스사회",    "https://www.newsis.com/RSS/society.xml"),
]

MUST_KEYWORDS = ["지원금", "환급금", "보조금", "바우처", "장려금", "급여", "혜택", "신청", "지원"]
BOOST_KEYWORDS = ["2025", "2026", "최대", "만원", "대상", "조건", "방법", "신청기간", "모집"]


def _score(title: str) -> int:
    s = sum(2 for k in MUST_KEYWORDS if k in title)
    s += sum(1 for k in BOOST_KEYWORDS if k in title)
    return s


def fetch_rss(
    sources: Iterable[tuple[str, str]] = DEFAULT_SOURCES,
    min_score: int = 2,
    max_per_source: int = 20,
) -> Iterable[dict]:
    ua = {"User-Agent": "Mozilla/5.0 govmate-crawler/1.0"}
    for source_name, url in sources:
        try:
            feed = feedparser.parse(url, request_headers=ua)
        except Exception as e:  # noqa: BLE001
            log.warning("RSS fail %s: %s", source_name, e)
            continue
        cnt = 0
        for entry in feed.entries[: max_per_source * 2]:
            title = (entry.get("title") or "").strip()
            if not title:
                continue
            if _score(title) < min_score:
                continue
            link = (entry.get("link") or "").strip()
            if not link:
                continue
            yield {
                "source": source_name,
                "title": title,
                "link": link,
                "published": entry.get("published") or entry.get("updated") or "",
                "summary": (entry.get("summary") or "")[:500],
            }
            cnt += 1
            if cnt >= max_per_source:
                break
