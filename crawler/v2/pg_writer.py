"""
Postgres(Prisma 스키마) 직접 upsert.

- DATABASE_URL 로 연결 (Vercel/Railway/Supabase 모두 호환)
- psycopg 3 사용 (동기 API, simple query)
- Prisma 가 만드는 컬럼명(카멜케이스)을 그대로 사용
- 테이블명은 소문자: Policy → "Policy" 쌍따옴표 필수
- sslmode 쿼리스트링은 URL 에 유저가 포함시켰다고 가정

이 모듈은 "직접 쓰기" 만 담당. 정규화/필터링은 pipeline.py.
"""

from __future__ import annotations

import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError as e:  # pragma: no cover
    raise SystemExit(
        "psycopg 3 (psycopg[binary]) 가 필요합니다. requirements-v2.txt 를 설치하세요."
    ) from e

log = logging.getLogger(__name__)


def _dsn() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    return url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(_dsn(), autocommit=False, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


# ─── Policy upsert ───────────────────────────────────────────────────
def slug_exists(conn: psycopg.Connection, slug: str) -> bool:
    with conn.cursor() as cur:
        cur.execute('SELECT 1 FROM "Policy" WHERE slug = %s LIMIT 1', (slug,))
        return cur.fetchone() is not None


def external_id_exists(conn: psycopg.Connection, external_id: str) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute(
            'SELECT id FROM "Policy" WHERE "externalId" = %s LIMIT 1',
            (external_id,),
        )
        row = cur.fetchone()
        return row["id"] if row else None


def insert_policy(conn: psycopg.Connection, data: dict) -> int:
    """
    필수: slug, title, content
    선택: excerpt, description, eligibility, applicationMethod, requiredDocuments,
          deadline, focusKeyword, metaDesc, status(default DRAFT),
          categoryId, geoRegion, geoDistrict, featuredImg, thumbnail,
          applyUrl, externalId, externalUrl, tags
    """
    now = datetime.now(timezone.utc)
    fields = {
        "slug": data["slug"],
        "title": data["title"],
        "content": data.get("content", ""),
        "excerpt": data.get("excerpt"),
        "description": data.get("description"),
        "eligibility": data.get("eligibility"),
        "applicationMethod": data.get("applicationMethod"),
        "requiredDocuments": data.get("requiredDocuments"),
        "deadline": data.get("deadline"),
        "focusKeyword": data.get("focusKeyword"),
        "metaDesc": data.get("metaDesc"),
        "status": data.get("status", "PUBLISHED"),
        "categoryId": data.get("categoryId"),
        "geoRegion": data.get("geoRegion"),
        "geoDistrict": data.get("geoDistrict"),
        "featuredImg": data.get("featuredImg"),
        "thumbnail": data.get("thumbnail"),
        "applyUrl": data.get("applyUrl"),
        "externalId": data.get("externalId"),
        "externalUrl": data.get("externalUrl"),
        "tags": data.get("tags"),
        "publishedAt": now if data.get("status", "PUBLISHED") == "PUBLISHED" else None,
        "createdAt": now,
        "updatedAt": now,
    }

    cols = list(fields.keys())
    placeholders = ", ".join(["%s"] * len(cols))
    columns_sql = ", ".join(f'"{c}"' for c in cols)

    sql = (
        f'INSERT INTO "Policy" ({columns_sql}) VALUES ({placeholders}) RETURNING id'
    )
    with conn.cursor() as cur:
        cur.execute(sql, [fields[c] for c in cols])
        row = cur.fetchone()
        assert row is not None
        return row["id"]


def update_policy(conn: psycopg.Connection, policy_id: int, data: dict) -> None:
    """외부에서 바뀐 필드만 덮어쓰기. None 값은 건너뜀(기존 값 보존)."""
    allowed = [
        "title", "content", "excerpt", "description", "eligibility",
        "applicationMethod", "requiredDocuments", "deadline", "focusKeyword",
        "metaDesc", "categoryId", "geoRegion", "geoDistrict", "featuredImg",
        "thumbnail", "applyUrl", "externalUrl", "tags",
    ]
    sets: list[str] = []
    vals: list = []
    for k in allowed:
        if k in data and data[k] is not None:
            sets.append(f'"{k}" = %s')
            vals.append(data[k])
    if not sets:
        return
    sets.append('"updatedAt" = %s')
    vals.append(datetime.now(timezone.utc))
    vals.append(policy_id)
    sql = f'UPDATE "Policy" SET {", ".join(sets)} WHERE id = %s'
    with conn.cursor() as cur:
        cur.execute(sql, vals)


def upsert_policy(conn: psycopg.Connection, data: dict) -> tuple[int, str]:
    """
    externalId 가 있으면 그걸로 매칭 → 있으면 update, 없으면 insert.
    externalId 가 없으면 slug 로 insert (slug 충돌은 호출부에서 uniquify 해야 함).

    반환: (policy_id, action)  action ∈ {"inserted", "updated", "skipped"}
    """
    ext = data.get("externalId")
    if ext:
        existing = external_id_exists(conn, ext)
        if existing:
            update_policy(conn, existing, data)
            return existing, "updated"
    try:
        new_id = insert_policy(conn, data)
        return new_id, "inserted"
    except psycopg.errors.UniqueViolation:
        conn.rollback()
        return -1, "skipped"


# ─── ApiSource 상태 반영 ───────────────────────────────────────────
def touch_api_source(
    conn: psycopg.Connection,
    name: str,
    url: str,
    type_: str,
    delta_count: int,
    success: bool,
    error_message: str | None = None,
) -> None:
    """
    ApiSource 한 줄의 lastSuccess / todayCount / totalCount 를 갱신.
    없으면 생성. 존재 시 UPSERT 로 증분.

    NOTE: schema 의 lastError 컬럼 타입은 DateTime? (이상하지만 존재 일자만 기록).
          문자열 에러메시지는 stdout 로만 찍고 DB 에는 타임스탬프만 남긴다.
    """
    now = datetime.now(timezone.utc)
    with conn.cursor() as cur:
        cur.execute('SELECT id, "todayCount", "totalCount" FROM "ApiSource" WHERE name = %s', (name,))
        row = cur.fetchone()
        if row:
            new_today = (row["todayCount"] or 0) + delta_count
            new_total = (row["totalCount"] or 0) + delta_count
            cur.execute(
                'UPDATE "ApiSource" SET url=%s, type=%s, status=%s, '
                '"lastSuccess"=%s, "lastError"=%s, "todayCount"=%s, "totalCount"=%s, "updatedAt"=%s '
                'WHERE id=%s',
                (
                    url, type_, "active" if success else "error",
                    now if success else None,
                    now if (not success and error_message) else None,
                    new_today, new_total, now, row["id"],
                ),
            )
        else:
            cur.execute(
                'INSERT INTO "ApiSource" (name, url, type, status, '
                '"lastSuccess", "lastError", "todayCount", "totalCount", "createdAt", "updatedAt") '
                'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                (
                    name, url, type_, "active" if success else "error",
                    now if success else None,
                    now if (not success and error_message) else None,
                    delta_count, delta_count, now, now,
                ),
            )
        if error_message:
            log.warning("api-source %s error: %s", name, error_message[:200])


def reset_today_counts(conn: psycopg.Connection) -> None:
    """자정 기준 todayCount 리셋 — GitHub Actions 는 매일 호출 전 한번 실행."""
    with conn.cursor() as cur:
        cur.execute('UPDATE "ApiSource" SET "todayCount" = 0, "updatedAt" = NOW()')


__all__ = [
    "connect",
    "slug_exists",
    "external_id_exists",
    "upsert_policy",
    "insert_policy",
    "update_policy",
    "touch_api_source",
    "reset_today_counts",
]
