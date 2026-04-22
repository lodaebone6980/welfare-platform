-- Policy 테이블에 외부 인기도 시그널 저장용 컬럼 추가
-- (네이버 뉴스 매칭 수 + Google Trends 점수 등 외부 시그널 집계값)
-- 마이그레이션은 멱등성을 위해 IF NOT EXISTS 사용

ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Policy_externalScore_idx" ON "Policy" ("externalScore" DESC);
