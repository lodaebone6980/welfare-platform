-- =============================================================================
-- API 수집현황 — 마이그레이션 SQL
--
-- 대상 테이블:
--   * ApiSource       — 정책/복지 API 소스 목록 (gov24, 복지로, 청년정책 등)
--   * CollectionRun   — 각 소스에 대한 개별 수집 실행 로그
--
-- 적용 위치: Supabase SQL Editor
-- 적용 순서: 이 파일 전체를 한 번에 실행
--
-- 전제: Prisma schema.prisma 에 이미 model ApiSource / model CollectionRun 가
--       정의되어 있고, 코드 ( /app/(admin)/api-status/page.tsx ) 도 이미 존재함.
--       DB 에 테이블 자체가 없어서 에러가 나는 상태일 때 이 SQL 로 보강.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) ApiSource — API 소스 마스터
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ApiSource" (
  id             SERIAL        PRIMARY KEY,
  name           TEXT          NOT NULL UNIQUE,
  url            TEXT          NOT NULL,
  type           TEXT          NOT NULL DEFAULT 'REST',
  status         TEXT          NOT NULL DEFAULT 'active',
  "lastSuccess"  TIMESTAMP(3),
  "lastError"    TIMESTAMP(3),
  "todayCount"   INTEGER       NOT NULL DEFAULT 0,
  "totalCount"   INTEGER       NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- 2) CollectionRun — 수집 실행 로그 (각 cron / 수동 트리거 1회 = 1 row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "CollectionRun" (
  id            SERIAL        PRIMARY KEY,
  "sourceId"    INTEGER       NOT NULL,
  "startedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"  TIMESTAMP(3),
  status        TEXT          NOT NULL DEFAULT 'running',   -- running | success | error | partial
  fetched       INTEGER       NOT NULL DEFAULT 0,
  created       INTEGER       NOT NULL DEFAULT 0,
  updated       INTEGER       NOT NULL DEFAULT 0,
  skipped       INTEGER       NOT NULL DEFAULT 0,
  "errorMsg"    TEXT,
  "durationMs"  INTEGER,
  "triggeredBy" TEXT          NOT NULL DEFAULT 'manual',    -- manual | cron | api

  CONSTRAINT "CollectionRun_sourceId_fkey"
    FOREIGN KEY ("sourceId")
    REFERENCES "ApiSource"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- ---------------------------------------------------------------------------
-- 3) 조회 성능용 인덱스 (Prisma @@index 와 동일)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "CollectionRun_sourceId_startedAt_idx"
  ON "CollectionRun" ("sourceId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS "CollectionRun_startedAt_idx"
  ON "CollectionRun" ("startedAt" DESC);

-- status 필터 (error 만 보기 등) 를 빠르게
CREATE INDEX IF NOT EXISTS "CollectionRun_status_startedAt_idx"
  ON "CollectionRun" (status, "startedAt" DESC);

-- ---------------------------------------------------------------------------
-- 4) updatedAt 자동 갱신 트리거 (Prisma @updatedAt 호환)
--    Prisma ORM 쪽은 Prisma 가 처리하지만, SQL 로 직접 UPDATE 할 경우 대비
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_apisource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apisource_updated_at ON "ApiSource";
CREATE TRIGGER trg_apisource_updated_at
  BEFORE UPDATE ON "ApiSource"
  FOR EACH ROW
  EXECUTE FUNCTION set_apisource_updated_at();

-- ---------------------------------------------------------------------------
-- 5) 초기 소스 시드 (govmate 가 쓰는 주요 외부 API)
--    이미 있으면 스킵 (ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------
INSERT INTO "ApiSource" (name, url, type, status) VALUES
  ('gov24',        'https://api.odcloud.kr/api/gov24/v3/serviceList',   'REST', 'active'),
  ('bokjiro',      'https://www.bokjiro.go.kr/openapi/svcList',         'REST', 'active'),
  ('youth_policy', 'https://www.youthcenter.go.kr/opi/youthPlcyList',   'REST', 'active'),
  ('seoul_open',   'http://openapi.seoul.go.kr:8088',                   'REST', 'active'),
  ('gyeonggi',     'https://data.gg.go.kr/dataset/openApiList.do',      'REST', 'active')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6) 통계 재수집
-- ---------------------------------------------------------------------------
ANALYZE "ApiSource";
ANALYZE "CollectionRun";

-- =============================================================================
-- 검증 쿼리 (주석 해제해서 개별 실행)
-- =============================================================================

-- 소스 목록
-- SELECT id, name, url, status, "todayCount", "totalCount", "lastSuccess"
-- FROM "ApiSource" ORDER BY id;

-- 최근 수집 20건
-- SELECT r.id, s.name, r."startedAt", r.status, r.fetched, r.created, r.updated, r.skipped, r."durationMs", r."triggeredBy"
-- FROM "CollectionRun" r
-- JOIN "ApiSource" s ON s.id = r."sourceId"
-- ORDER BY r."startedAt" DESC
-- LIMIT 20;

-- 소스별 최근 성공/실패 집계
-- SELECT s.name,
--        COUNT(*) FILTER (WHERE r.status = 'success') AS success_cnt,
--        COUNT(*) FILTER (WHERE r.status = 'error')   AS error_cnt,
--        MAX(r."startedAt")                           AS last_run
-- FROM "ApiSource" s
-- LEFT JOIN "CollectionRun" r ON r."sourceId" = s.id
-- GROUP BY s.name
-- ORDER BY s.name;
