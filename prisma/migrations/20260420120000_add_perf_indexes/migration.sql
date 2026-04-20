-- Performance indexes for hot paths (popular sort, featured, category-latest, expiring, FAQ join)
-- These are additive; CREATE INDEX IF NOT EXISTS prevents double-run errors.

CREATE INDEX IF NOT EXISTS "Policy_status_viewCount_idx"
  ON "Policy"("status", "viewCount" DESC);

CREATE INDEX IF NOT EXISTS "Policy_status_featured_featuredOrder_idx"
  ON "Policy"("status", "featured", "featuredOrder");

CREATE INDEX IF NOT EXISTS "Policy_status_categoryId_publishedAt_idx"
  ON "Policy"("status", "categoryId", "publishedAt" DESC);

CREATE INDEX IF NOT EXISTS "Policy_status_deadline_idx"
  ON "Policy"("status", "deadline");

CREATE INDEX IF NOT EXISTS "Faq_policyId_idx"
  ON "Faq"("policyId");
