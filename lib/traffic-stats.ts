import { prisma } from '@/lib/prisma'
import {
  classifyChannel,
  type Channel,
  type TrafficSource,
} from '@/lib/tracking'

/**
 * PageView 모델이 아직 prisma generate 되지 않은 환경에서도 빌드가 깨지지 않도록
 * 동적으로 접근한다. (DB push 전에는 안전하게 빈 결과를 반환)
 */
function pv(): any {
  const anyPrisma = prisma as any
  return anyPrisma.pageView ?? null
}

export type Range = '24h' | '7d' | '30d' | '90d'

export function rangeStart(range: Range): Date {
  const now = new Date()
  const d = new Date(now)
  switch (range) {
    case '24h':
      d.setDate(d.getDate() - 1)
      return d
    case '7d':
      d.setDate(d.getDate() - 7)
      return d
    case '30d':
      d.setDate(d.getDate() - 30)
      return d
    case '90d':
      d.setDate(d.getDate() - 90)
      return d
  }
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** 오늘 날짜 기준 KPI */
export async function getTodayKpis() {
  const client = pv()
  if (!client) {
    return {
      pvToday: 0,
      uvToday: 0,
      sourcesToday: [] as { source: string; count: number }[],
    }
  }
  const from = startOfToday()
  try {
    const [pvToday, bySource, uvRows] = await Promise.all([
      client.count({ where: { createdAt: { gte: from } } }),
      client.groupBy({
        by: ['source'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
      }),
      client.findMany({
        where: { createdAt: { gte: from } },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
    ])

    return {
      pvToday,
      uvToday: uvRows.length,
      sourcesToday: bySource.map((r: any) => ({
        source: r.source,
        count: r._count._all,
      })),
    }
  } catch {
    return {
      pvToday: 0,
      uvToday: 0,
      sourcesToday: [] as { source: string; count: number }[],
    }
  }
}

/** 기간별 소스 분포 */
export async function getSourceDistribution(range: Range) {
  const client = pv()
  if (!client) return [] as { source: string; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['source'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    })
    return rows.map((r: any) => ({ source: r.source, count: r._count._all }))
  } catch {
    return []
  }
}

/** 기기 분포 (mobile/tablet/desktop) */
export async function getDeviceDistribution(range: Range) {
  const client = pv()
  if (!client) return [] as { device: string; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['device'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { device: 'desc' } },
    })
    return rows.map((r: any) => ({ device: r.device, count: r._count._all }))
  } catch {
    return []
  }
}

/** 플랫폼 분포 (web/app) */
export async function getPlatformDistribution(range: Range) {
  const client = pv()
  if (!client) return [] as { platform: string; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['platform'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { platform: 'desc' } },
    })
    return rows.map((r: any) => ({ platform: r.platform, count: r._count._all }))
  } catch {
    return []
  }
}

/**
 * 일별 × 소스별 페이지뷰.
 * Prisma groupBy는 날짜 단위 truncation 지원이 제한적이라
 * raw SQL(Postgres date_trunc)로 집계한다.
 */
export async function getDailySourceSeries(range: Range) {
  const client = pv()
  if (!client) return [] as { day: string; source: string; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
              source,
              COUNT(*)::int AS count
         FROM "PageView"
        WHERE "createdAt" >= $1
        GROUP BY 1, 2
        ORDER BY 1 ASC, 3 DESC`,
      from,
    )
    return rows.map((r: any) => ({
      day: String(r.day),
      source: String(r.source),
      count: Number(r.count),
    }))
  } catch {
    return []
  }
}

/** Top N 페이지 */
export async function getTopPages(range: Range, take = 10) {
  const client = pv()
  if (!client) return [] as { path: string; count: number; title?: string | null }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['path'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take,
    })
    const paths = rows.map((r: any) => r.path)
    const titleRows = paths.length
      ? await client.findMany({
          where: { path: { in: paths }, title: { not: null } },
          select: { path: true, title: true },
          distinct: ['path'],
        })
      : []
    const titleMap = new Map<string, string>()
    titleRows.forEach((r: any) => {
      if (r.title) titleMap.set(r.path, r.title)
    })
    return rows.map((r: any) => ({
      path: r.path,
      count: r._count._all,
      title: titleMap.get(r.path) ?? null,
    }))
  } catch {
    return []
  }
}

/** UV (세션 고유 수) */
export async function getUv(range: Range) {
  const client = pv()
  if (!client) return 0
  const from = rangeStart(range)
  try {
    const rows = await client.findMany({
      where: { createdAt: { gte: from } },
      select: { sessionId: true },
      distinct: ['sessionId'],
    })
    return rows.length
  } catch {
    return 0
  }
}

/** PV */
export async function getPv(range: Range) {
  const client = pv()
  if (!client) return 0
  const from = rangeStart(range)
  try {
    return await client.count({ where: { createdAt: { gte: from } } })
  } catch {
    return 0
  }
}

/* ======================================================================
 * 채널(유료/자연) 분석 — source · medium · utmSource · utmMedium 조합 기반
 * ====================================================================== */

/** 채널 분포: 세분화된 채널별 PV 집계 (내림차순) */
export async function getChannelDistribution(range: Range) {
  const client = pv()
  if (!client) return [] as { channel: Channel; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['source', 'medium', 'utmSource', 'utmMedium'],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
    })
    const counter = new Map<Channel, number>()
    for (const r of rows as any[]) {
      const ch = classifyChannel({
        source: (r.source ?? 'other') as TrafficSource,
        medium: r.medium ?? null,
        utmSource: r.utmSource ?? null,
        utmMedium: r.utmMedium ?? null,
      })
      counter.set(ch, (counter.get(ch) ?? 0) + (r._count?._all ?? 0))
    }
    return Array.from(counter.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

/** 유료 vs 자연 vs 소셜 vs 직접 vs 레퍼럴 — 상위 5 버킷 롤업 */
export async function getPaidVsOrganic(range: Range) {
  const channels = await getChannelDistribution(range)
  const bucket = { paid: 0, organicSearch: 0, socialOrganic: 0, direct: 0, referral: 0, email: 0, other: 0 }
  for (const c of channels) {
    if (c.channel.startsWith('paid_')) bucket.paid += c.count
    else if (c.channel.startsWith('organic_search_')) bucket.organicSearch += c.count
    else if (c.channel.startsWith('social_organic_')) bucket.socialOrganic += c.count
    else if (c.channel === 'direct') bucket.direct += c.count
    else if (c.channel === 'referral') bucket.referral += c.count
    else if (c.channel === 'email') bucket.email += c.count
    else bucket.other += c.count
  }
  return bucket
}

/** 특정 source에 대해 상세: 일자별 추이 + 유료/자연 split + 상위 UTM 캠페인 */
export async function getSourceDetail(range: Range, source: TrafficSource) {
  const client = pv()
  if (!client) {
    return {
      source,
      total: 0,
      paid: 0,
      organic: 0,
      topCampaigns: [] as { campaign: string; count: number }[],
      topLandingPages: [] as { path: string; count: number }[],
      daily: [] as { day: string; paid: number; organic: number }[],
    }
  }
  const from = rangeStart(range)
  try {
    const [mediumRows, campaignRows, landingRows, dailyRows] = await Promise.all([
      client.groupBy({
        by: ['utmMedium', 'medium'],
        where: { createdAt: { gte: from }, source },
        _count: { _all: true },
      }),
      client.groupBy({
        by: ['utmCampaign'],
        where: { createdAt: { gte: from }, source, utmCampaign: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { utmCampaign: 'desc' } },
        take: 10,
      }),
      client.groupBy({
        by: ['path'],
        where: { createdAt: { gte: from }, source },
        _count: { _all: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
                COALESCE("utmMedium", "medium") AS med,
                COUNT(*)::int AS count
           FROM "PageView"
          WHERE "createdAt" >= $1 AND source = $2
          GROUP BY 1, 2
          ORDER BY 1 ASC`,
        from,
        source,
      ),
    ])

    let paid = 0
    let organic = 0
    const paidMediums = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search', 'paid_social', 'paid-social', 'display', 'cpm', 'cpv', 'cpa', 'cpi'])
    for (const r of mediumRows as any[]) {
      const m = ((r.utmMedium || r.medium) ?? '').toLowerCase()
      if (paidMediums.has(m)) paid += r._count._all
      else organic += r._count._all
    }

    const dailyMap = new Map<string, { paid: number; organic: number }>()
    for (const r of dailyRows as any[]) {
      const m = String(r.med ?? '').toLowerCase()
      const key = String(r.day)
      const cur = dailyMap.get(key) ?? { paid: 0, organic: 0 }
      if (paidMediums.has(m)) cur.paid += Number(r.count)
      else cur.organic += Number(r.count)
      dailyMap.set(key, cur)
    }

    return {
      source,
      total: paid + organic,
      paid,
      organic,
      topCampaigns: (campaignRows as any[])
        .filter(r => r.utmCampaign)
        .map(r => ({ campaign: String(r.utmCampaign), count: r._count._all })),
      topLandingPages: (landingRows as any[]).map(r => ({
        path: String(r.path),
        count: r._count._all,
      })),
      daily: Array.from(dailyMap.entries())
        .map(([day, v]) => ({ day, paid: v.paid, organic: v.organic }))
        .sort((a, b) => a.day.localeCompare(b.day)),
    }
  } catch {
    return {
      source,
      total: 0,
      paid: 0,
      organic: 0,
      topCampaigns: [] as { campaign: string; count: number }[],
      topLandingPages: [] as { path: string; count: number }[],
      daily: [] as { day: string; paid: number; organic: number }[],
    }
  }
}

/** UTM 캠페인 전체 Top N */
export async function getTopCampaigns(range: Range, take = 15) {
  const client = pv()
  if (!client) return [] as { campaign: string; source: string; medium: string; count: number }[]
  const from = rangeStart(range)
  try {
    const rows = await client.groupBy({
      by: ['utmCampaign', 'utmSource', 'utmMedium'],
      where: { createdAt: { gte: from }, utmCampaign: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { utmCampaign: 'desc' } },
      take,
    })
    return (rows as any[])
      .filter(r => r.utmCampaign)
      .map(r => ({
        campaign: String(r.utmCampaign),
        source: String(r.utmSource ?? '-'),
        medium: String(r.utmMedium ?? '-'),
        count: r._count._all,
      }))
  } catch {
    return []
  }
}

/** 레퍼럴 상세 Top N — source='other' 중 referrer 도메인별 */
export async function getReferrerDomains(range: Range, take = 15) {
  const client = pv()
  if (!client) return [] as { domain: string; count: number }[]
  const from = rangeStart(range)
  try {
    // PostgreSQL 정규식: referrer에서 호스트명만 추출
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT lower(substring(referrer from '(?:.*://)?([^/?#]+)')) AS domain,
              COUNT(*)::int AS count
         FROM "PageView"
        WHERE "createdAt" >= $1
          AND referrer IS NOT NULL
          AND referrer <> ''
          AND source = 'other'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT $2`,
      from,
      take,
    )
    return (rows as any[])
      .filter(r => r.domain)
      .map(r => ({ domain: String(r.domain), count: Number(r.count) }))
  } catch {
    return []
  }
}

/** 광고 캠페인 요약 지표 — 유료 채널의 총 PV · UV · 상위 캠페인 */
export async function getPaidSummary(range: Range) {
  const client = pv()
  if (!client) return { paidPv: 0, paidUv: 0, topCampaigns: [] as { campaign: string; source: string; count: number }[] }
  const from = rangeStart(range)
  const paidMediums = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search', 'paid_social', 'paid-social', 'display', 'cpm', 'cpv', 'cpa', 'cpi']
  try {
    const [pvCount, uvRows, campaigns] = await Promise.all([
      client.count({
        where: {
          createdAt: { gte: from },
          OR: [
            { utmMedium: { in: paidMediums } },
            { medium: { in: paidMediums } },
          ],
        },
      }),
      client.findMany({
        where: {
          createdAt: { gte: from },
          OR: [
            { utmMedium: { in: paidMediums } },
            { medium: { in: paidMediums } },
          ],
        },
        select: { sessionId: true },
        distinct: ['sessionId'],
      }),
      client.groupBy({
        by: ['utmCampaign', 'utmSource'],
        where: {
          createdAt: { gte: from },
          utmCampaign: { not: null },
          OR: [
            { utmMedium: { in: paidMediums } },
            { medium: { in: paidMediums } },
          ],
        },
        _count: { _all: true },
        orderBy: { _count: { utmCampaign: 'desc' } },
        take: 10,
      }),
    ])
    return {
      paidPv: pvCount,
      paidUv: uvRows.length,
      topCampaigns: (campaigns as any[])
        .filter(c => c.utmCampaign)
        .map(c => ({
          campaign: String(c.utmCampaign),
          source: String(c.utmSource ?? '-'),
          count: c._count._all,
        })),
    }
  } catch {
    return { paidPv: 0, paidUv: 0, topCampaigns: [] }
  }
}
