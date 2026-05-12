import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/server-auth';

const prisma = new PrismaClient();

export async function GET(_request: NextRequest) {
  try {
    const deny = await requireAdmin();
    if (deny) return deny;

    // Use raw SQL for speed - single query updates all at once
    const result = await prisma.$executeRaw`
      UPDATE "Policy"
      SET 
        "applyUrl" = 'https://www.gov.kr/search?srhQuery=' || regexp_replace("title", '^\\[.*?\\]\\s*', ''),
        "externalUrl" = 'https://www.bokjiro.go.kr/ssis-tbu/NationalWelfareInformationM.do?searchKeyword=' || regexp_replace("title", '^\\[.*?\\]\\s*', '')
      WHERE "applyUrl" LIKE '%gov.kr/portal/welfare/%'
    `;

    return NextResponse.json({ 
      success: true, 
      updated: result,
      message: `Updated ${result} policies with raw SQL`
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
