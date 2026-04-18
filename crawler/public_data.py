"""
공공데이터포털 (data.go.kr) 통합 어댑터 — 크롤러용.

설계 원칙:
- 외부 의존 최소화: requests 만 사용 (없으면 urllib fallback)
- 키는 DATA_GO_KR_KEY 환경변수에서 읽음 (URL-encoded 또는 raw 둘 다 지원)
- 목록 API 는 Iterator 로 페이징 처리
- 네트워크 오류/타임아웃 시 예외 대신 빈 결과 반환 (크롤러 파이프라인 보호)

지원 카탈로그는 lib/public-data/data-go-kr.ts 와 동일한 키를 사용:
- bokjiro.list       (복지로 서비스목록)
- bokjiro.detail     (복지로 서비스상세)
- kstartup.policy    (온통청년 청년정책)
- sbiz.policy        (소상공인24 지원정책)

크롤러 main.py 에서 사용 예:

    from public_data import fetch_bokjiro_list

    for item in fetch_bokjiro_list(max_pages=3):
        # item 은 dict. title/summary/applyUrl 등 사전 정규화 완료
        process(item)
"""

from __future__ import annotations

import os
import re
import json
import time
import logging
from dataclasses import dataclass, field
from typing import Iterator, Optional

log = logging.getLogger(__name__)

try:
    import requests  # type: ignore
    _HAS_REQUESTS = True
except ImportError:  # pragma: no cover
    import urllib.request
    import urllib.parse
    _HAS_REQUESTS = False


DEFAULT_TIMEOUT = 15  # seconds


def _get_service_key() -> str:
    k = os.getenv("DATA_GO_KR_KEY", "").strip()
    if not k:
        raise RuntimeError("DATA_GO_KR_KEY not set")
    return k


def _http_get(url: str, timeout: int = DEFAULT_TIMEOUT) -> tuple[int, str]:
    if _HAS_REQUESTS:
        try:
            r = requests.get(url, timeout=timeout)
            return r.status_code, r.text
        except requests.RequestException as e:
            log.warning("http_get failed: %s", e)
            return 0, ""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "govmate-crawler/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except Exception as e:  # noqa: BLE001
        log.warning("http_get failed: %s", e)
        return 0, ""


def _build_url(base: str, params: dict) -> str:
    service_key = _get_service_key()
    # 포털에서 주는 key 는 이미 URL-encoded 된 경우가 많아 raw 로 붙인다.
    pairs = [f"serviceKey={service_key}"]
    for k, v in params.items():
        if v is None:
            continue
        pairs.append(f"{k}={v}")
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}" + "&".join(pairs)


# ─── XML 미니 파서 (item 단위) ────────────────────────────────────────
_ITEM_RE = re.compile(r"<item>([\s\S]*?)</item>", re.IGNORECASE)
_TAG_RE = re.compile(r"<([a-zA-Z][\w:\-]*)>([\s\S]*?)</\1>")
_CDATA_RE = re.compile(r"<!\[CDATA\[|\]\]>")


def parse_xml_items(xml: str) -> list[dict]:
    out: list[dict] = []
    if not xml:
        return out
    for m in _ITEM_RE.finditer(xml):
        body = m.group(1)
        row: dict = {}
        for t in _TAG_RE.finditer(body):
            tag = t.group(1)
            val = _CDATA_RE.sub("", t.group(2)).strip()
            row[tag] = val
        out.append(row)
    return out


# ─── 카탈로그 ────────────────────────────────────────────────────────
@dataclass
class Endpoint:
    key: str
    name: str
    base: str
    response_type: str = "xml"  # xml | json
    default_params: dict = field(default_factory=dict)


ENDPOINTS: dict[str, Endpoint] = {
    "bokjiro.list": Endpoint(
        key="bokjiro.list",
        name="복지로 서비스목록",
        base="https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001",
        response_type="xml",
        default_params={"numOfRows": "50", "pageNo": "1"},
    ),
    "bokjiro.detail": Endpoint(
        key="bokjiro.detail",
        name="복지로 서비스상세",
        base="https://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfaredetailedV001",
        response_type="xml",
    ),
    "kstartup.policy": Endpoint(
        key="kstartup.policy",
        name="온통청년 청년정책",
        base="https://www.youthcenter.go.kr/opi/youthPlcyList.do",
        response_type="json",
        default_params={"rtnType": "json", "pageSize": "50", "pageIndex": "1"},
    ),
    "sbiz.policy": Endpoint(
        key="sbiz.policy",
        name="소상공인24 지원정책",
        base="https://apis.data.go.kr/1130000/BizSupportPolicyService/getBizSupportPolicyList",
        response_type="json",
        default_params={"numOfRows": "50", "pageNo": "1", "type": "json"},
    ),
}


def fetch_one(endpoint_key: str, params: Optional[dict] = None) -> dict:
    """단건 호출 → {ok, status, items: [dict, ...], raw}"""
    ep = ENDPOINTS.get(endpoint_key)
    if not ep:
        return {"ok": False, "error": f"unknown endpoint {endpoint_key}"}
    merged = {**ep.default_params, **(params or {})}
    url = _build_url(ep.base, merged)
    status, text = _http_get(url)
    if not text:
        return {"ok": False, "status": status, "items": []}
    if ep.response_type == "xml":
        items = parse_xml_items(text)
        return {"ok": True, "status": status, "items": items, "raw": text[:500]}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"ok": False, "status": status, "items": [], "raw": text[:500]}
    items = _extract_json_items(data)
    return {"ok": True, "status": status, "items": items, "raw": None}


def _extract_json_items(data) -> list[dict]:
    """JSON 응답에서 '항목 리스트' 추정해 돌려주기."""
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict)]
    if isinstance(data, dict):
        # 흔한 컨테이너 키들
        for k in ("youthPolicyList", "items", "data", "resultList", "list", "rows"):
            v = data.get(k)
            if isinstance(v, list):
                return [d for d in v if isinstance(d, dict)]
            if isinstance(v, dict):
                inner = _extract_json_items(v)
                if inner:
                    return inner
        # 마지막 시도: response.body.items.item 구조
        body = (data.get("response") or {}).get("body") or {}
        items = body.get("items")
        if isinstance(items, dict):
            item = items.get("item")
            if isinstance(item, list):
                return [d for d in item if isinstance(d, dict)]
            if isinstance(item, dict):
                return [item]
    return []


# ─── 정규화 래퍼 ─────────────────────────────────────────────────────
def _first(row: dict, *keys) -> str:
    for k in keys:
        v = row.get(k)
        if v:
            return str(v).strip()
    return ""


def fetch_bokjiro_list(
    max_pages: int = 5, page_size: int = 50, sleep: float = 0.3
) -> Iterator[dict]:
    """
    복지로 서비스 목록을 페이징으로 순회.
    각 row 를 { external_id, title, summary, provider, apply_url, category } 로 정규화.
    """
    for page in range(1, max_pages + 1):
        res = fetch_one(
            "bokjiro.list", {"pageNo": str(page), "numOfRows": str(page_size)}
        )
        items = res.get("items") or []
        if not items:
            return
        for row in items:
            yield {
                "source": "bokjiro",
                "external_id": _first(row, "servId", "serviceId", "wlfareInfoId"),
                "title": _first(row, "servNm", "wlfareInfoNm", "title"),
                "summary": _first(row, "servDgst", "summary", "intrsThemaNmArray"),
                "provider": _first(row, "ctpvNm", "jurOrgNm", "bizChrDeptNm"),
                "apply_url": _first(row, "servDtlLink", "wlfareInfoDetailLink"),
                "category": _first(row, "lifeArray", "trgterIndvdlArray"),
                "raw": row,
            }
        time.sleep(sleep)


def fetch_youth_policy(
    max_pages: int = 3, page_size: int = 50, sleep: float = 0.3
) -> Iterator[dict]:
    """온통청년 청년정책 목록."""
    for page in range(1, max_pages + 1):
        res = fetch_one(
            "kstartup.policy", {"pageIndex": str(page), "pageSize": str(page_size)}
        )
        items = res.get("items") or []
        if not items:
            return
        for row in items:
            yield {
                "source": "youthcenter",
                "external_id": _first(row, "bizId", "plcyNo"),
                "title": _first(row, "polyBizSjnm", "plcyNm", "title"),
                "summary": _first(row, "polyItcnCn", "plcyExplnCn", "summary"),
                "provider": _first(row, "cnsgNmor", "rgtrInstCdNm"),
                "apply_url": _first(row, "rfcSiteUrla1", "aplyUrlAddr"),
                "category": _first(row, "polyRlmCd", "lclsfNm"),
                "raw": row,
            }
        time.sleep(sleep)


__all__ = [
    "ENDPOINTS",
    "fetch_one",
    "fetch_bokjiro_list",
    "fetch_youth_policy",
    "parse_xml_items",
]
