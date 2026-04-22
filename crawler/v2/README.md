# 크롤러 v2 운영 가이드

Postgres(Prisma 스키마) 직접 upsert 파이프라인. 기존 `crawler/main.py` (WP 경로) 와 병행 가능.

## 구성

| 파일 | 역할 |
|------|------|
| `v2/main.py` | CLI entry (`python -m crawler.v2.main ...`) |
| `v2/pipeline.py` | 소스 iterator → 정규화 → upsert → IndexNow 핑 |
| `v2/pg_writer.py` | psycopg 3 Postgres upsert (`Policy`, `ApiSource`) |
| `v2/rss_fetcher.py` | feedparser 기반 RSS 후보 수집 |
| `v2/slugify.py` | 한글 친화 슬러그 생성기 |
| `../public_data.py` | 복지로·온통청년·소상공인 어댑터 (v2 가 재사용) |
| `../requirements-v2.txt` | `feedparser`, `httpx`, `psycopg[binary]` |

## 로컬 실행

```bash
# 의존성 설치
pip install -r crawler/requirements-v2.txt

# 환경변수 설정 (.env 를 export 하거나 shell 에 inline)
export DATABASE_URL='postgresql://user:pw@host:5432/db?sslmode=require'
export DATA_GO_KR_KEY='발급받은_키'
export SITE_URL='https://govmate.co.kr'
export INDEXNOW_KEY='발급받은_indexnow_키'  # 옵션

# 연결 테스트 (DB 안 씀)
python -m crawler.v2.main --dry-run

# 전체 소스 수집 (소스별 최대 50건)
python -m crawler.v2.main --source all --max 50

# 개별 소스
python -m crawler.v2.main --source bokjiro --max 100
python -m crawler.v2.main --source youth --max 30
python -m crawler.v2.main --source rss --max 20

# 오늘 카운터 리셋 (cron 에서 매일 아침 한 번)
python -m crawler.v2.main --reset-today
```

## GitHub Actions cron

`.github/workflows/crawler-daily.yml` 이 매일 03:00 KST(18:00 UTC) 에 자동 실행합니다.

필요한 repo secrets:
- `DATABASE_URL`
- `DATA_GO_KR_KEY`
- `INDEXNOW_KEY` (선택)

repo variables (Settings → Variables):
- `SITE_URL` (예: `https://govmate.co.kr`)

수동 실행: GitHub → Actions → "Daily Crawler v2" → Run workflow.

## 정책

- **중복 방지**: 소스별로 `externalId` 에 `bokjiro:…` / `youth:…` / `rss:<url>` 프리픽스를 붙여 unique. 재실행 시 update 경로.
- **슬러그 충돌**: `slugify_kr` 가 같은 결과를 내면 접미사(`-bj123456`) 로 구분. 그래도 겹치면 upsert 의 `UniqueViolation` 을 잡아 skip.
- **Policy status**:
  - `bokjiro`, `youth`: `PUBLISHED` (출처 신뢰 + 구조화)
  - `rss`: `DRAFT` (본문이 요약만 있으므로 사람 검수 필요)
- **에러 격리**: 한 건 실패가 전체 루프를 막지 않고, 결과 JSON 의 `errors` 카운트로 보고.

## 다음 단계

1. 어드민 `/api-status` 페이지가 `ApiSource` 테이블을 읽으므로 실제 수집이 돌기 시작하면 자동으로 차트에 반영됩니다.
2. RSS 는 본문 빈약이라 `DRAFT` 로만 떨어지는데, 필요하면 `newspaper3k` 를 추가해 본문 추출 + GPT 리라이팅 단계를 `pipeline.py` 에 훅으로 붙이면 됩니다 (옵션).
3. `run_bokjiro()` 등에 `category_id` 매핑을 붙이려면 `lib/category-mapper.ts` 와 같은 규칙을 파이썬으로 포팅해 `_norm_*` 에 주입.
