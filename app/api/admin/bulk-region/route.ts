import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { KR_REGIONS, REGION_BY_SLUG } from '@/lib/regions'

/**
 * POST /api/admin/bulk-region
 * body: {
 *   baseId: number,           // 복제 원본 Policy.id
 *   regionSlugs: string[],    // ['seoul', 'busan', ...]
 *   titleTemplate?: string,   // "{region} {title}" (기본)
 *   dryRun?: boolean          // true 면 DB 쓰지 않고 미리보기
 * }
 *
 * 복제 정책:
 * - slug = `${base.slug}-${regionSlug}` (최대 120자)
 * - title = 템플릿({region}=short, {regionFull}=name, {title}=원본 title)
 * - content/excerpt/description 은 원본 그대로 유지
 * - geoRegion 을 지역명으로 덮어씀
 * - status = DRAFT (검토 후 수동 PUBLISH)
 * - featured=false, featuredOrder=0, viewCount/views=0
 * - externalId/wpId 는 복제하지 않음 (unique 충돌 방지)
 * - 동일 slug 가 이미 존재하면 skip (idempotent)
 *
 * 응답: { ok, created: [...], skipped: [...], errors: [...] }
 *
 * 실제 접근 제한은 /middleware.ts 에서 NextAuth 세션 검사로 처리.
 */

type Body = {
  baseId?: number
  regionSlugs?: string[]
  titleTemplate?: string
  dryRun?: boolean
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_REGIONS = 20
const DEFAULT_TEMPLATE = '{region} {title}'

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }

  const baseId = Number(body.baseId)
  if (!Number.isFinite(baseId) || baseId <= 0) {
    return NextResponse.json({ ok: false, error: 'baseId required' }, { status: 400 })
  }

  const slugs = Array.isArray(body.regionSlugs) ? body.regionSlugs.slice(0, MAX_REGIONS) : []
  const regions = slugs
    .map((s) => REGION_BY_SLUG[s])
    .filter((r): r is NonNullable<typeof r> => !!r)
  if (regions.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'regionSlugs empty or unknown' },
      { status: 400 }
    )
  }

  const titleTemplate = body.titleTemplate?.trim() || DEFAULT_TEMPLATE
  const dryRun = Boolean(body.dryRun)

  const base = await prisma.policy.findUnique({ where: { id: baseId } })
  if (!base) {
    return NextResponse.json({ ok: false, error: 'base policy not found' }, { status: 404 })
  }

  const plans = regions.map((r) => {
    const title = render(titleTemplate, {
      region: r.short,
      regionFull: r.name,
      title: base.title,
    })
    const slug = `${base.slug}-${r.slug}`.slice(0, 120)
    return { regionSlug: r.slug, regionName: r.name, slug, title }
  })

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, plans })
  }

  const created: { id: number; slug: string; title: string; regionSlug: string }[] = []
  const skipped: { slug: string; reason: string }[] = []
  const errors: { slug: string; error: string }[] = []

  // 개별 upsert — 한건 실패가 전체를 막지 않도록 loop 처리
  for (const p of plans) {
    try {
      const exists = await prisma.policy.findUnique({ where: { slug: p.slug } })
      if (exists) {
        skipped.push({ slug: p.slug, reason: 'slug already exists' })
        continue
      }
      const row = await prisma.policy.create({
        data: {
          slug: p.slug,
          title: p.title,
          content: base.content,
          excerpt: base.excerpt,
          description: base.description,
          eligibility: base.eligibility,
          applicationMethod: base.applicationMethod,
          requiredDocuments: base.requiredDocuments,
          deadline: base.deadline,
          focusKeyword: base.focusKeyword,
          metaDesc: base.metaDesc,
          status: 'DRAFT',
          categoryId: base.categoryId,
          geoRegion: p.regionName,
          geoDistrict: null,
          featuredImg: base.featuredImg,
          thumbnail: base.thumbnail,
          applyUrl: base.applyUrl,
          externalUrl: base.externalUrl,
          viewCount: 0,
          views: 0,
          featured: false,
          featuredOrder: 0,
          priority: base.priority,
          tags: base.tags,
        },
      })
      created.push({ id: row.id, slug: row.slug, title: row.title, regionSlug: p.regionSlug })
    } catch (err: any) {
      errors.push({ slug: p.slug, error: String(err?.message || err) })
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    baseId,
    created,
    skipped,
    errors,
  })
}
