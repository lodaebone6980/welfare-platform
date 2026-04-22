-- ===========================================================
-- 트렌드/뉴스 수집 스키마 (Supabase)
-- 실행 전 DB 백업 권장
-- ===========================================================

-- 1. 열거형
DO $$ BEGIN
  CREATE TYPE "TrendSource" AS ENUM ('GOOGLE_TRENDS','NAVER_DATALAB','NEWS_AGG');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "CandidateStatus" AS ENUM ('PENDING','APPROVED','REJECTED','DUPLICATE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. NewsItem
CREATE TABLE IF NOT EXISTS "NewsItem" (
  "id"              SERIAL PRIMARY KEY,
  "source"          text NOT NULL,         -- 'korea_kr' | 'naver_news' | 'motie' 등
  "url"             text NOT NULL UNIQUE,
  "title"           text NOT NULL,
  "summary"         text,
  "publishedAt"     timestamptz NOT NULL,
  "agency"          text,
  "matchedKeywords" text[] NOT NULL DEFAULT '{}',
  "fetchedAt"       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "NewsItem_source_publishedAt_idx" ON "NewsItem"("source","publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsItem_publishedAt_idx"        ON "NewsItem"("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "NewsItem_matchedKeywords_gin"    ON "NewsItem" USING GIN ("matchedKeywords");

-- 3. TrendKeyword
CREATE TABLE IF NOT EXISTS "TrendKeyword" (
  "id"              SERIAL PRIMARY KEY,
  "keyword"         text NOT NULL,
  "source"          "TrendSource" NOT NULL,
  "score"           double precision NOT NULL,
  "newsCount24h"    integer NOT NULL DEFAULT 0,
  "capturedAt"      timestamptz NOT NULL,
  "normalizedTopic" text
);
CREATE INDEX IF NOT EXISTS "TrendKeyword_capturedAt_idx" ON "TrendKeyword"("capturedAt" DESC);
CREATE INDEX IF NOT EXISTS "TrendKeyword_score_idx"      ON "TrendKeyword"("score" DESC);
CREATE INDEX IF NOT EXISTS "TrendKeyword_topic_idx"      ON "TrendKeyword"("normalizedTopic");

-- 4. PolicyCandidate
CREATE TABLE IF NOT EXISTS "PolicyCandidate" (
  "id"                SERIAL PRIMARY KEY,
  "topic"             text NOT NULL,
  "suggestedTitle"    text NOT NULL,
  "agency"            text,
  "summary"           text NOT NULL,
  "newsItemIds"       integer[] NOT NULL DEFAULT '{}',
  "trendScore"        double precision NOT NULL DEFAULT 0,
  "status"            "CandidateStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy"        integer,
  "reviewedAt"        timestamptz,
  "promotedPolicyId"  integer,
  "createdAt"         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PolicyCandidate_status_idx"    ON "PolicyCandidate"("status");
CREATE INDEX IF NOT EXISTS "PolicyCandidate_createdAt_idx" ON "PolicyCandidate"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PolicyCandidate_topic_idx"     ON "PolicyCandidate"("topic");

-- 5. ApiSource 에 신규 source 3건 업서트 (이미 있으면 건드리지 않음)
INSERT INTO "ApiSource" ("name","displayName","enabled","totalCount","todayCount","createdAt","updatedAt")
VALUES
  ('news_rss',       '뉴스·보도자료 RSS', true, 0, 0, now(), now()),
  ('naver_datalab',  '네이버 데이터랩',   true, 0, 0, now(), now()),
  ('google_trends',  '구글 트렌드',       true, 0, 0, now(), now())
ON CONFLICT ("name") DO NOTHING;

-- 완료.
