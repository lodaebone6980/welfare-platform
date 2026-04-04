-- AlterTable
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "eligibility" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "applicationMethod" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "requiredDocuments" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "deadline" VARCHAR(255);
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "thumbnail" VARCHAR(255);
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255);
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Policy_externalId_key" ON "Policy"("externalId");
CREATE INDEX IF NOT EXISTS "Policy_status_categoryId_idx" ON "Policy"("status", "categoryId");
CREATE INDEX IF NOT EXISTS "Policy_externalId_idx" ON "Policy"("externalId");

-- AlterTable Category
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(10);
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0;
