import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key || !key.includes('12ac8429')) {
      return NextResponse.json({ success: false, message: 'Invalid key' }, { status: 401 });
    }

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
