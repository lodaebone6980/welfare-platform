-- CollectionRun: 각 API 수집 실행 이력
CREATE TABLE IF NOT EXISTS "CollectionRun" (
  "id"          SERIAL PRIMARY KEY,
  "sourceId"    INTEGER NOT NULL REFERENCES "ApiSource"("id") ON DELETE CASCADE,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"  TIMESTAMP(3),
  "status"      TEXT NOT NULL DEFAULT 'running', -- running | success | error | partial
  "fetched"     INTEGER NOT NULL DEFAULT 0,
  "created"     INTEGER NOT NULL DEFAULT 0,
  "updated"     INTEGER NOT NULL DEFAULT 0,
  "skipped"     INTEGER NOT NULL DEFAULT 0,
  "errorMsg"    TEXT,
  "durationMs"  INTEGER,
  "triggeredBy" TEXT NOT NULL DEFAULT 'manual'   -- manual | cron | api
);

CREATE INDEX IF NOT EXISTS "CollectionRun_sourceId_startedAt_idx"
  ON "CollectionRun" ("sourceId", "startedAt" DESC);

CREATE INDEX IF NOT EXISTS "CollectionRun_startedAt_idx"
  ON "CollectionRun" ("startedAt" DESC);

-- ApiSource 초기 데이터 (복지로만 우선)
INSERT INTO "ApiSource" ("name", "url", "type", "status", "createdAt", "updatedAt")
VALUES (
  '복지로',
  'https://apis.data.go.kr/B554287/NationalWelforeInformationsV001/getNationalWelforeInformationList',
  'REST_XML',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "ApiSource" ("name", "url", "type", "status", "createdAt", "updatedAt")
VALUES (
  '정부24',
  'https://apis.data.go.kr/1750000/gvsrv/getServiceList',
  'REST_XML',
  'inactive',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "ApiSource" ("name", "url", "type", "status", "createdAt", "updatedAt")
VALUES (
  '기업마당',
  'https://www.bizinfo.go.kr/uss/rss/bizPbancListRss.do',
  'RSS',
  'inactive',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO NOTHING;
