import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POLICY_STATUSES = new Set(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])

const detailSelect = {
  id: true,
  slug: true,
  title: true,
  content: true,
  excerpt: true,
  description: true,
  eligibility: true,
  applicationMethod: true,
  requiredDocuments: true,
  deadline: true,
  focusKeyword: true,
  metaDesc: true,
  status: true,
  categoryId: true,
  geoRegion: true,
  geoDistrict: true,
  thumbnail: true,
  applyUrl: true,
  externalUrl: true,
  viewCount: true,
  featured: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
} as const

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

function getId(params: { id: string }) {
  const id = Number(params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

function policyData(body: any) {
  const status = normalizeStatus(body.status)
  const categoryId = asNullableNumber(body.categoryId)
  const data: any = {
    ...(typeof body.title === 'string' && { title: body.title.trim() || 'Untitled policy' }),
    ...(typeof body.slug === 'string' && { slug: slugify(body.slug) }),
    ...(asNullableString(body.content) !== undefined && { content: asNullableString(body.content) ?? '' }),
    ...(asNullableString(body.excerpt) !== undefined && { excerpt: asNullableString(body.excerpt) }),
    ...(asNullableString(body.description) !== undefined && { description: asNullableString(body.description) }),
    ...(asNullableString(body.eligibility) !== undefined && { eligibility: asNullableString(body.eligibility) }),
    ...(asNullableString(body.applicationMethod) !== undefined && { applicationMethod: asNullableString(body.applicationMethod) }),
    ...(asNullableString(body.requiredDocuments) !== undefined && { requiredDocuments: asNullableString(body.requiredDocuments) }),
    ...(asNullableString(body.deadline) !== undefined && { deadline: asNullableString(body.deadline) }),
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

  if (data.status === 'PUBLISHED' && !body.publishedAt) {
    data.publishedAt = new Date()
  }

  return data
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAdmin()
  if (deny) return deny

  const id = getId(params)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  const policy = await prisma.policy.findUnique({ where: { id }, select: detailSelect })
  if (!policy) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json(policy)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAdmin()
  if (deny) return deny

  const id = getId(params)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  try {
    const policy = await prisma.policy.update({
      where: { id },
      data: policyData(body),
      select: detailSelect,
    })
    return NextResponse.json(policy)
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'POLICY_UPDATE_FAILED' },
      { status: 400 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const deny = await requireAdmin()
  if (deny) return deny

  const id = getId(params)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  try {
    await prisma.policy.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'POLICY_DELETE_FAILED' },
      { status: 400 }
    )
  }
}
