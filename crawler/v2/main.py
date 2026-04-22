"""
크롤러 v2 CLI entry.

사용 예:
  python -m crawler.v2.main --source all --max 50
  python -m crawler.v2.main --source bokjiro --max 100
  python -m crawler.v2.main --source rss --dry-run
  python -m crawler.v2.main --reset-today

환경변수:
  DATABASE_URL        (필수) Prisma 와 동일
  DATA_GO_KR_KEY      (bokjiro/youth 용)
  INDEXNOW_KEY        (옵션) 있으면 신규 slug 를 IndexNow 로 핑
  SITE_URL            (옵션) 기본 https://govmate.co.kr
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from typing import Callable

from .pipeline import (
    RunStats,
    run_bokjiro,
    run_rss,
    run_youth,
    reset_today_counts,
)
from .pg_writer import connect

log = logging.getLogger("crawler.v2")


def _build_pinger() -> Callable[[list[str]], None] | None:
    site = os.getenv("SITE_URL", "https://govmate.co.kr").rstrip("/")
    key = os.getenv("INDEXNOW_KEY", "").strip()
    if not key:
        return None
    try:
        import httpx  # type: ignore
    except ImportError:
        try:
            import requests as httpx  # type: ignore
        except ImportError:
            return None

    endpoint = f"{site}/api/indexnow"

    def _ping(slugs: list[str]) -> None:
        if not slugs:
            return
        urls = [f"{site}/welfare/{s}" for s in slugs if s]
        try:
            r = httpx.post(endpoint, json={"urls": urls}, timeout=8)
            log.info("indexnow ping %d urls → HTTP %s", len(urls), r.status_code)
        except Exception as e:  # noqa: BLE001
            log.warning("indexnow ping failed: %s", e)

    return _ping


def _print_stats(stats: list[RunStats]) -> None:
    total = {"seen": 0, "inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    for s in stats:
        for k in total:
            total[k] += getattr(s, k)
    print(json.dumps(
        {"runs": [s.as_dict() for s in stats], "total": total},
        ensure_ascii=False,
        indent=2,
    ))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="govmate crawler v2")
    parser.add_argument(
        "--source",
        choices=["bokjiro", "youth", "rss", "all"],
        default="all",
        help="수집할 소스",
    )
    parser.add_argument("--max", type=int, default=50, help="소스별 최대 아이템 수")
    parser.add_argument("--dry-run", action="store_true", help="DB 쓰지 않고 연결 테스트")
    parser.add_argument("--reset-today", action="store_true", help="ApiSource.todayCount 일괄 0")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    )

    if args.dry_run:
        try:
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT COUNT(*) AS n FROM "Policy"')
                    row = cur.fetchone()
            print(json.dumps({"ok": True, "policy_count": row["n"] if row else 0}))
            return 0
        except Exception as e:  # noqa: BLE001
            print(json.dumps({"ok": False, "error": str(e)}))
            return 1

    if args.reset_today:
        with connect() as conn:
            reset_today_counts(conn)
            conn.commit()
        log.info("todayCount reset")

    pinger = _build_pinger()
    runs: list[RunStats] = []

    if args.source in ("bokjiro", "all"):
        try:
            runs.append(run_bokjiro(max_items=args.max, pinger=pinger))
        except Exception as e:  # noqa: BLE001
            log.error("bokjiro run failed: %s", e)
    if args.source in ("youth", "all"):
        try:
            runs.append(run_youth(max_items=args.max, pinger=pinger))
        except Exception as e:  # noqa: BLE001
            log.error("youth run failed: %s", e)
    if args.source in ("rss", "all"):
        try:
            runs.append(run_rss(max_items=args.max, pinger=pinger))
        except Exception as e:  # noqa: BLE001
            log.error("rss run failed: %s", e)

    _print_stats(runs)

    total_errors = sum(s.errors for s in runs)
    return 0 if total_errors == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
