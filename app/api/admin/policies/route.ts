import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TAKE = 100
const POLICY_STATUSES = new Set(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])

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
  focusKeyword: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
} as const

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  return value.trim() || null
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || `policy-${Date.now()}`
}

function normalizeStatus(value: unknown) {
  const status = typeof value === 'string' ? value.toUpperCase() : undefined
  return status && POLICY_STATUSES.has(status) ? status : undefined
}

function policyData(body: any, mode: 'create' | 'update') {
  const title = asString(body.title)
  const status = normalizeStatus(body.status)
  const rawSlug = asString(body.slug)
  const categoryId = asNullableNumber(body.categoryId)
  const deadline = asNullableString(body.deadline)

  const data: any = {
    ...(title !== undefined && { title }),
    ...(rawSlug !== undefined && { slug: slugify(rawSlug) }),
    ...(asNullableString(body.content) !== undefined && { content: asNullableString(body.content) ?? '' }),
    ...(asNullableString(body.excerpt) !== undefined && { excerpt: asNullableString(body.excerpt) }),
    ...(asNullableString(body.description) !== undefined && { description: asNullableString(body.description) }),
    ...(asNullableString(body.eligibility) !== undefined && { eligibility: asNullableString(body.eligibility) }),
    ...(asNullableString(body.applicationMethod) !== undefined && { applicationMethod: asNullableString(body.applicationMethod) }),
    ...(asNullableString(body.requiredDocuments) !== undefined && { requiredDocuments: asNullableString(body.requiredDocuments) }),
    ...(deadline !== undefined && { deadline }),
    ...(asNullableString(body.focusKeyword) !== undefined && { focusKeyword: asNullableString(body.focusKeyword) }),
    ...(asNullableString(body.metaDesc) !== undefined && { metaDesc: asNullableString(body.metaDesc) }),
    ...(status !== undefined && { status }),
    ...(categoryId !== undefined && { categoryId }),
    ...(asNullableString(body.geoRegion) !== undefined && { geoRegion: asNullableString(body.geoRegion) }),
    ...(asNullableString(body.geoDistrict) !== undefined && { geoDistrict: asNullableString(body.geoDistrict) }),
    ...(asNullableString(body.thumbnail) !== undefined && { thumbnail: asNullableString(body.thumbnail) }),
    ...(asNullableString(body.applyUrl) !== undefined && { applyUrl: asNullableString(body.applyUrl) }),
    ...(asNullableString(body.externalUrl) !== undefined && { externalUrl: asNullableString(body.externalUrl) }),
    ...(typeof body.featured === 'boolean' && { featured: body.featured }),
  }

  if (mode === 'create') {
    data.title = title || 'Untitled policy'
    data.slug = slugify(rawSlug || data.title)
    data.content = asNullableString(body.content) ?? ''
    data.status = status || 'DRAFT'
  }

  if (data.status === 'PUBLISHED' && !body.publishedAt) {
    data.publishedAt = new Date()
  }

  return data
}

export async function GET(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  const { searchParams } = new URL(req.url)
  const requestedStatus = searchParams.get('status')?.toUpperCase()
  const status = requestedStatus && POLICY_STATUSES.has(requestedStatus) ? requestedStatus : undefined
  const geoRegion = searchParams.get('geoRegion') ?? undefined
  const categoryId = searchParams.get('categoryId')
  const search = searchParams.get('search') ?? undefined
  const take = Math.min(Math.max(Number(searchParams.get('take') ?? 20), 1), MAX_TAKE)
  const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0)

  const where: any = {
    ...(status && { status }),
    ...(geoRegion && { geoRegion }),
    ...(categoryId && { categoryId: Number(categoryId) }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { focusKeyword: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

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

export async function POST(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  const body = await req.json().catch(() => ({}))
  const data = policyData(body, 'create')

  try {
    const policy = await prisma.policy.create({ data, select: listSelect })
    return NextResponse.json(policy, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'POLICY_CREATE_FAILED' },
      { status: 400 }
    )
  }
}
