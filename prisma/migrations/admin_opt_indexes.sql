-- =============================================================================
-- 정책 관리 / 카테고리 목록 성능 최적화 — 마이그레이션 SQL
--
-- 적용 대상: Supabase (PostgreSQL)
-- 적용 위치: Supabase SQL Editor 에서 한 번에 실행
-- 예상 시간: 1만 건 기준 3~10초
-- 다운타임: 없음 (CREATE INDEX CONCURRENTLY 사용 가능하나,
--           Supabase 는 트랜잭션 안에서 CONCURRENTLY 못쓰므로 일반 CREATE 사용)
-- =============================================================================

-- 1) 유사 매칭(ILIKE '%검색어%') 을 위한 trigram 확장
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) 검색 대상 텍스트 컬럼에 GIN trigram 인덱스
--    → 'title ILIKE %청년%' 같은 쿼리가 인덱스 스캔으로 변경
--    → 1만 건 기준 full scan 200~600ms → 인덱스 20~50ms 수준
CREATE INDEX IF NOT EXISTS idx_policy_title_trgm
  ON "Policy" USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_policy_excerpt_trgm
  ON "Policy" USING GIN (excerpt gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_policy_focus_trgm
  ON "Policy" USING GIN ("focusKeyword" gin_trgm_ops);

-- 3) 정렬 + 필터 복합 인덱스 (기본 orderBy createdAt desc 에 맞춤)
--    → 관리자 목록 페이지네이션 성능 핵심
CREATE INDEX IF NOT EXISTS idx_policy_createdat_desc
  ON "Policy" ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_policy_status_createdat
  ON "Policy" (status, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_policy_category_createdat
  ON "Policy" ("categoryId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_policy_georegion_createdat
  ON "Policy" ("geoRegion", "createdAt" DESC);

-- 4) 선택: 발행 상태 + 발행시각 복합 인덱스 (공개 페이지에서 사용)
CREATE INDEX IF NOT EXISTS idx_policy_status_publishedat
  ON "Policy" (status, "publishedAt" DESC NULLS LAST);

-- 5) 통계 재수집 (플래너가 새 인덱스를 인식하도록)
ANALYZE "Policy";

-- =============================================================================
-- 검증 쿼리 (실행 후 결과 확인용 - 주석 해제해서 개별 실행)
-- =============================================================================

-- 현재 정책 Row 수 확인
-- SELECT COUNT(*) AS policy_count FROM "Policy";

-- 인덱스 적용 여부 확인 (title trigram 검색)
-- EXPLAIN ANALYZE
-- SELECT id, slug, title FROM "Policy"
-- WHERE title ILIKE '%청년%'
-- ORDER BY "createdAt" DESC
-- LIMIT 20;
-- ↑ 결과에 "Bitmap Index Scan on idx_policy_title_trgm" 가 보이면 성공

-- 인덱스 적용 여부 확인 (카테고리 필터)
-- EXPLAIN ANALYZE
-- SELECT id, slug, title FROM "Policy"
-- WHERE "categoryId" = 1
-- ORDER BY "createdAt" DESC
-- LIMIT 20;
-- ↑ "Index Scan using idx_policy_category_createdat" 가 보이면 성공
