import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/policies — 정책 목록
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    as any
  const geoRegion = searchParams.get('geoRegion') ?? undefined
  const take      = Number(searchParams.get('take') ?? 20)
  const skip      = Number(searchParams.get('skip') ?? 0)

  const policies = await prisma.policy.findMany({
    where: {
      ...(status    && { status }),
      ...(geoRegion && { geoRegion }),
    },
    orderBy: { publishedAt: 'desc' },
    take,
    skip,
    include: { category: true, faqs: { orderBy: { order: 'asc' } } },
  })

  const total = await prisma.policy.count({
    where: {
      ...(status    && { status }),
      ...(geoRegion && { geoRegion }),
    },
  })

  return NextResponse.json({ policies, total })
}

// POST /api/policies — 정책 생성
export async function POST(req: NextRequest) {
  const body = await req.json()

  const policy = await prisma.policy.create({
    data: {
      slug:         body.slug,
      title:        body.title,
      content:      body.content,
      excerpt:      body.excerpt,
      focusKeyword: body.focusKeyword,
      metaDesc:     body.metaDesc,
      status:       body.status ?? 'DRAFT',
      geoRegion:    body.geoRegion,
      featuredImg:  body.featuredImg,
      applyUrl:     body.applyUrl,
      publishedAt:  body.status === 'PUBLISHED' ? new Date() : null,
      faqs: body.faqs?.length > 0
        ? { create: body.faqs.map((f: any, i: number) => ({ question: f.q, answer: f.a, order: i })) }
        : undefined,
    },
  })

  return NextResponse.json(policy, { status: 201 })
}
