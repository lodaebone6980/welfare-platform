"""
크롤러 v2 오케스트레이션.

소스별 Iterator → 정규화 → upsert → IndexNow 핑.
실패는 try/except 로 격리해 한 건이 전체 파이프를 막지 못하게 한다.
"""

from __future__ import annotations

import logging
import os
import sys
from dataclasses import dataclass
from typing import Iterable, Optional

# crawler/ 자체를 PYTHONPATH 에 추가해 public_data.py 를 import
_HERE = os.path.dirname(os.path.abspath(__file__))
_CRAWLER_DIR = os.path.dirname(_HERE)
if _CRAWLER_DIR not in sys.path:
    sys.path.insert(0, _CRAWLER_DIR)

from public_data import fetch_bokjiro_list, fetch_youth_policy  # noqa: E402

from .pg_writer import (  # noqa: E402
    connect,
    upsert_policy,
    touch_api_source,
    reset_today_counts,
)
from .rss_fetcher import fetch_rss, DEFAULT_SOURCES  # noqa: E402
from .slugify import slugify_kr  # noqa: E402

log = logging.getLogger(__name__)


@dataclass
class RunStats:
    source: str
    seen: int = 0
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    errors: int = 0

    def as_dict(self) -> dict:
        return {
            "source": self.source,
            "seen": self.seen,
            "inserted": self.inserted,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
        }


# ─── 정규화 ────────────────────────────────────────────────────────
def _norm_bokjiro(row: dict) -> Optional[dict]:
    title = (row.get("title") or "").strip()
    if not title:
        return None
    ext = row.get("external_id") or ""
    slug_base = slugify_kr(title)
    if not slug_base:
        return None
    slug = f"{slug_base}-bj{ext[-6:]}" if ext else slug_base

    summary = (row.get("summary") or "").strip()
    apply_url = (row.get("apply_url") or "").strip() or None
    provider = (row.get("provider") or "").strip()

    body_md = (
        f"## 한눈에 보기\n\n"
        f"{summary or title}\n\n"
        f"## 운영 기관\n\n{provider or '복지로 (보건복지부)'}\n\n"
    )
    return {
        "slug": slug[:120],
        "title": title,
        "content": body_md,
        "excerpt": (summary or title)[:140],
        "description": summary,
        "applyUrl": apply_url,
        "externalId": f"bokjiro:{ext}" if ext else None,
        "externalUrl": apply_url,
        "geoRegion": None,  # 복지로 목록은 전국
        "tags": "복지,복지로,정부지원금",
        "status": "PUBLISHED",
    }


def _norm_youth(row: dict) -> Optional[dict]:
    title = (row.get("title") or "").strip()
    if not title:
        return None
    ext = row.get("external_id") or ""
    slug_base = slugify_kr(title)
    if not slug_base:
        return None
    slug = f"{slug_base}-yc{ext[-6:]}" if ext else slug_base

    summary = (row.get("summary") or "").strip()
    apply_url = (row.get("apply_url") or "").strip() or None
    provider = (row.get("provider") or "").strip()

    body_md = (
        f"## 한눈에 보기\n\n{summary or title}\n\n"
        f"## 운영 기관\n\n{provider or '온통청년 / 국무조정실'}\n\n"
    )
    return {
        "slug": slug[:120],
        "title": title,
        "content": body_md,
        "excerpt": (summary or title)[:140],
        "description": summary,
        "applyUrl": apply_url,
        "externalId": f"youth:{ext}" if ext else None,
        "externalUrl": apply_url,
        "tags": "청년,온통청년,청년정책",
        "status": "PUBLISHED",
    }


def _norm_rss(row: dict) -> Optional[dict]:
    title = (row.get("title") or "").strip()
    link = (row.get("link") or "").strip()
    if not title or not link:
        return None
    slug = slugify_kr(title)[:120]
    if not slug:
        return None
    summary = (row.get("summary") or "").strip()
    body = (
        f"## 요약\n\n{summary or title}\n\n"
        f"---\n\n원문 출처: [{row.get('source','')}]({link})\n"
    )
    return {
        "slug": slug,
        "title": title,
        "content": body,
        "excerpt": (summary or title)[:140],
        "description": summary,
        "externalId": f"rss:{link}",
        "externalUrl": link,
        "tags": f"뉴스,{row.get('source','')}",
        # RSS는 일단 DRAFT 로 — 본문 빈약하니 사람이 검토
        "status": "DRAFT",
    }


# ─── 실행기 ────────────────────────────────────────────────────────
def _run_iter(
    source_name: str,
    source_url: str,
    source_type: str,
    items: Iterable[dict],
    normalizer,
    max_items: int,
    pinger=None,
) -> RunStats:
    stats = RunStats(source=source_name)
    pushed_slugs: list[str] = []
    with connect() as conn:
        for raw in items:
            if stats.seen >= max_items:
                break
            stats.seen += 1
            try:
                norm = normalizer(raw)
                if not norm:
                    stats.skipped += 1
                    continue
                pid, action = upsert_policy(conn, norm)
                if action == "inserted":
                    stats.inserted += 1
                    pushed_slugs.append(norm["slug"])
                elif action == "updated":
                    stats.updated += 1
                else:
                    stats.skipped += 1
                conn.commit()
            except Exception as e:  # noqa: BLE001
                conn.rollback()
                stats.errors += 1
                log.warning("[%s] item failed: %s", source_name, e)
        # ApiSource 기록
        try:
            touch_api_source(
                conn,
                name=source_name,
                url=source_url,
                type_=source_type,
                delta_count=stats.inserted + stats.updated,
                success=stats.errors == 0,
                error_message=None if stats.errors == 0 else f"{stats.errors} errors",
            )
            conn.commit()
        except Exception as e:  # noqa: BLE001
            log.warning("touch_api_source failed: %s", e)

    if pinger and pushed_slugs:
        try:
            pinger(pushed_slugs)
        except Exception as e:  # noqa: BLE001
            log.warning("indexnow ping failed: %s", e)

    return stats


def run_bokjiro(max_items: int = 50, pinger=None) -> RunStats:
    return _run_iter(
        source_name="복지로 서비스목록",
        source_url="https://apis.data.go.kr/B554287/NationalWelfareInformationsV001",
        source_type="REST",
        items=fetch_bokjiro_list(max_pages=max(1, max_items // 50 + 1)),
        normalizer=_norm_bokjiro,
        max_items=max_items,
        pinger=pinger,
    )


def run_youth(max_items: int = 50, pinger=None) -> RunStats:
    return _run_iter(
        source_name="온통청년 청년정책",
        source_url="https://www.youthcenter.go.kr/opi/youthPlcyList.do",
        source_type="REST",
        items=fetch_youth_policy(max_pages=max(1, max_items // 50 + 1)),
        normalizer=_norm_youth,
        max_items=max_items,
        pinger=pinger,
    )


def run_rss(max_items: int = 30, pinger=None) -> RunStats:
    return _run_iter(
        source_name="공공뉴스 RSS",
        source_url=",".join(u for _, u in DEFAULT_SOURCES),
        source_type="RSS",
        items=fetch_rss(max_per_source=10),
        normalizer=_norm_rss,
        max_items=max_items,
        pinger=pinger,
    )


__all__ = ["run_bokjiro", "run_youth", "run_rss", "RunStats", "reset_today_counts"]
