import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key || !key.includes('12ac8429')) {
      return NextResponse.json({ success: false, message: 'Invalid key' }, { status: 401 });
    }

    const policies = await prisma.policy.findMany({
      where: { applyUrl: { contains: 'gov.kr/portal/welfare/' } },
      select: { id: true, title: true, geoRegion: true }
    });

    let updated = 0;
    for (const p of policies) {
      const keyword = encodeURIComponent(p.title.replace(/\[.*?\]\s*/, ''));
      await prisma.policy.update({
        where: { id: p.id },
        data: {
          applyUrl: `https://www.gov.kr/search?srhQuery=${keyword}`,
          externalUrl: `https://www.bokjiro.go.kr/ssis-tbu/NationalWelfareInformationM.do?searchKeyword=${keyword}`
        }
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated, message: `Updated ${updated} policies` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}