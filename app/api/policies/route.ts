import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================
// GET /api/policies — 정책 목록 (최적화 버전)
//
// 변경 요약
//   1) include → select 로 전환. content / description / eligibility 등
//      긴 Text 필드를 목록에서 제외 → 페이로드 대폭 축소
//   2) category 는 id/name/slug 만 join
//   3) _count.faqs 제거 (목록엔 불필요, 상세에서만 필요)
//   4) count 는 검색어가 없을 때만 실행 (count full scan 회피)
//      검색어 있을 땐 hasMore 만 계산 (take+1 패턴)
//   5) 최대 take 100 으로 cap 걸어 남용 방지
// ============================================================

const MAX_TAKE = 100

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')    as any
  const geoRegion = searchParams.get('geoRegion') ?? undefined
  const categoryId = searchParams.get('categoryId')
  const search    = searchParams.get('search')    ?? undefined
  const take      = Math.min(Number(searchParams.get('take') ?? 20), MAX_TAKE)
  const skip      = Number(searchParams.get('skip') ?? 0)

  const where: any = {
    ...(status    && { status }),
    ...(geoRegion && { geoRegion }),
    ...(categoryId && { categoryId: Number(categoryId) }),
    ...(search    && {
      OR: [
        { title:        { contains: search, mode: 'insensitive' } },
        { excerpt:      { contains: search, mode: 'insensitive' } },
        { focusKeyword: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  // 목록에 필요한 최소 필드만
  const listSelect = {
    id: true,
    slug: true,
    title: true,
    excerpt: true,
    status: true,
    geoRegion: true,
    geoDistrict: true,
    thumbnail: true,
    viewCount: true,
    featured: true,
    featuredOrder: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    category: {
      select: { id: true, name: true, slug: true },
    },
  } as const

  // 검색어 없을 때만 count 병렬 실행 (full scan 방지)
  const canCountFast = !search

  if (canCountFast) {
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: listSelect,
      }),
      prisma.policy.count({ where }),
    ])
    return NextResponse.json({ policies, total, hasMore: skip + policies.length < total })
  }

  // 검색 쿼리: count 대신 take+1 로 hasMore 계산
  const rows = await prisma.policy.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    skip,
    select: listSelect,
  })
  const hasMore = rows.length > take
  const policies = hasMore ? rows.slice(0, take) : rows
  return NextResponse.json({ policies, total: null, hasMore })
}

// ============================================================
// POST /api/policies — 정책 생성 (기존 유지)
// ============================================================
export async function POST(req: NextRequest) {
  const body = await req.json()

  const policy = await prisma.policy.create({
    data: {
      slug:              body.slug,
      title:             body.title,
      content:           body.content,
      excerpt:           body.excerpt,
      description:       body.description,
      eligibility:       body.eligibility,
      applicationMethod: body.applicationMethod,
      requiredDocuments: body.requiredDocuments,
      deadline:          body.deadline,
      focusKeyword:      body.focusKeyword,
      metaDesc:          body.metaDesc,
      status:            body.status,
      categoryId:        body.categoryId,
      geoRegion:         body.geoRegion,
      geoDistrict:       body.geoDistrict,
      thumbnail:         body.thumbnail,
      applyUrl:          body.applyUrl,
      externalId:        body.externalId,
      externalUrl:       body.externalUrl,
      featured:          body.featured ?? false,
      featuredOrder:     body.featuredOrder ?? 0,
      tags:              body.tags,
    },
  })
  return NextResponse.json(policy)
}
