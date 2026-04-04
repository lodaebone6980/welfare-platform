import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This route runs DB migration - should be called once then removed
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  // Simple auth check
  if (key !== process.env.DATA_GO_KR_API_KEY?.substring(0, 10)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Add new columns to Policy table
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "description" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "eligibility" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "applicationMethod" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "requiredDocuments" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "deadline" VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "thumbnail" VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "externalUrl" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "tags" TEXT`);

    // Add unique index on externalId
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Policy_externalId_key" ON "Policy"("externalId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Policy_status_categoryId_idx" ON "Policy"("status", "categoryId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Policy_externalId_idx" ON "Policy"("externalId")`);

    // Category table updates
    await prisma.$executeRawUnsafe(`ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(10)`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0`);

    return NextResponse.json({ success: true, message: 'Migration completed successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
