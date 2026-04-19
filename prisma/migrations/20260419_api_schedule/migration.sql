-- Add scheduling & auto-publish columns to ApiSource
-- Run this SQL in Supabase SQL Editor to enable API 수집 스케줄링.
--
-- schedule         : cron expression ('0 * * * *') or interval label ('1h', '6h', 'daily')
-- autoPublish      : if true, collected DRAFT policies are auto-published
-- lastScheduledRun : last time the cron job picked this source
-- cronSecret       : per-source optional secret (unused for now; reserved)

ALTER TABLE "ApiSource"
  ADD COLUMN IF NOT EXISTS "schedule" TEXT,
  ADD COLUMN IF NOT EXISTS "autoPublish" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastScheduledRun" TIMESTAMP(3);

-- Index for cron scheduler to quickly find due sources
CREATE INDEX IF NOT EXISTS "ApiSource_schedule_idx" ON "ApiSource" ("schedule");

-- Sensible defaults for existing sources
UPDATE "ApiSource"
   SET "schedule" = COALESCE("schedule", 'daily'),
       "autoPublish" = COALESCE("autoPublish", false)
 WHERE "schedule" IS NULL OR "autoPublish" IS NULL;
