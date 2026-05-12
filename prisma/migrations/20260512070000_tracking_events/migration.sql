CREATE TABLE "TrackingEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "fullPath" TEXT,
  "title" TEXT,
  "source" TEXT NOT NULL,
  "medium" TEXT,
  "sessionId" TEXT NOT NULL,
  "visitorId" TEXT,
  "userAgent" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmTerm" TEXT,
  "utmContent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TrackingEvent_createdAt_idx" ON "TrackingEvent"("createdAt");
CREATE INDEX "TrackingEvent_name_createdAt_idx" ON "TrackingEvent"("name", "createdAt");
CREATE INDEX "TrackingEvent_path_createdAt_idx" ON "TrackingEvent"("path", "createdAt");
CREATE INDEX "TrackingEvent_source_createdAt_idx" ON "TrackingEvent"("source", "createdAt");
CREATE INDEX "TrackingEvent_sessionId_idx" ON "TrackingEvent"("sessionId");
CREATE INDEX "TrackingEvent_visitorId_idx" ON "TrackingEvent"("visitorId");
CREATE INDEX "TrackingEvent_utmCampaign_createdAt_idx" ON "TrackingEvent"("utmCampaign", "createdAt");
CREATE INDEX "TrackingEvent_source_utmMedium_createdAt_idx" ON "TrackingEvent"("source", "utmMedium", "createdAt");
