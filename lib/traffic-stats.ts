import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
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

/**
 * DB 단에서 COUNT(DISTINCT "sessionId") — findMany + distinct 대비 수십배 빠름.
 * whereSQL 예: `"createdAt" >= $1`
 */
async function countDistinctSessions(whereSQL: string, ...params: any[]): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ uv: number | bigint | string }[]>(
      `SELECT COUNT(DISTINCT "sessionId")::int AS uv FROM "PageView" WHERE ${whereSQL}`,
      ...params,
    )
    const v = rows[0]?.uv
    return typeof v === 'number' ? v : Number(v ?? 0)
  } catch {
    return 0
  }
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
    const [pvToday, bySource, uvToday] = await Promise.all([
      client.count({ where: { createdAt: { gte: from } } }),
      client.groupBy({
        by: ['source'],
        where: { createdAt: { gte: from } },
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
      }),
      countDistinctSessions(`"createdAt" >= $1`, from),
    ])

    return {
      pvToday,
      uvToday,
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

/** 기간별 소스 분포 (30초 캐시) */
export const getSourceDistribution = unstable_cache(
  async (range: Range) => {
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
  },
  ['traffic:source-distribution'],
  { revalidate: 30, tags: ['traffic'] },
)

/** 기기 분포 (30초 캐시) */
export const getDeviceDistribution = unstable_cache(
  async (range: Range) => {
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
  },
  ['traffic:device-distribution'],
  { revalidate: 30, tags: ['traffic'] },
)

/** 플랫폼 분포 (30초 캐시) */
export const getPlatformDistribution = unstable_cache(
  async (range: Range) => {
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
  },
  ['traffic:platform-distribution'],
  { revalidate: 30, tags: ['traffic'] },
)

/** 일별 × 소스별 PV (30초 캐시) */
export const getDailySourceSeries = unstable_cache(
  async (range: Range) => {
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
  },
  ['traffic:daily-source-series'],
  { revalidate: 30, tags: ['traffic'] },
)

/** Top N 페이지 (30초 캐시) */
export const getTopPages = unstable_cache(
  async (range: Range, take = 10) => {
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
  },
  ['traffic:top-pages'],
  { revalidate: 30, tags: ['traffic'] },
)

/** UV — DB 단 COUNT(DISTINCT) (30초 캐시) */
export const getUv = unstable_cache(
  async (range: Range) => {
    const from = rangeStart(range)
    return countDistinctSessions(`"createdAt" >= $1`, from)
  },
  ['traffic:uv'],
  { revalidate: 30, tags: ['traffic'] },
)

/** PV (30초 캐시) */
export const getPv = unstable_cache(
  async (range: Range) => {
    const client = pv()
    if (!client) return 0
    const from = rangeStart(range)
    try {
      return await client.count({ where: { createdAt: { gte: from } } })
    } catch {
      return 0
    }
  },
  ['traffic:pv'],
  { revalidate: 30, tags: ['traffic'] },
)

/* ======================================================================
 * 채널(유료/자연) 분석
 * ====================================================================== */

/** 채널 분포: 세분화된 채널별 PV 집계 (30초 캐시) */
export const getChannelDistribution = unstable_cache(
  async (range: Range) => {
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
  },
  ['traffic:channel-distribution'],
  { revalidate: 30, tags: ['traffic'] },
)

/**
 * 이미 조회된 channels 배열을 받아 7버킷으로 롤업하는 순수 함수.
 * getChannelDistribution 결과를 재활용하여 중복 쿼리 제거.
 */
export function bucketizeChannels(channels: { channel: Channel; count: number }[]) {
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

/** @deprecated — page에서는 getChannelDistribution 결과를 bucketizeChannels 로 재사용하세요. */
export async function getPaidVsOrganic(range: Range) {
  const channels = await getChannelDistribution(range)
  return bucketizeChannels(channels)
}

/**
 * 여러 소스에 대한 상세를 한 번에 — 기존 per-source 4쿼리 × 9소스 = 36쿼리를
 * source IN(...) + window function 으로 3쿼리에 끝낸다.
 *
 * 반환 데이터: 각 source별 total / paid / organic / topCampaigns / topLandingPages.
 * (daily 시리즈는 현재 UI 미사용 → 생략하여 1쿼리 추가 절약)
 */
const PAID_MEDIUMS_ARR = ['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search', 'paid_social', 'paid-social', 'display', 'cpm', 'cpv', 'cpa', 'cpi']

export const getSourceDetailsBulk = unstable_cache(
  async (range: Range, sources: TrafficSource[]) => {
    const from = rangeStart(range)
    const emptyResult = (s: TrafficSource) => ({
      source: s,
      total: 0,
      paid: 0,
      organic: 0,
      topCampaigns: [] as { campaign: string; count: number }[],
      topLandingPages: [] as { path: string; count: number }[],
    })

    if (sources.length === 0) return [] as ReturnType<typeof emptyResult>[]

    try {
      // 3 raw SQL queries total for all sources combined.
      const [mediumRows, campaignRows, landingRows] = await Promise.all([
        // (1) source × medium rollup
        prisma.$queryRawUnsafe<any[]>(
          `SELECT source,
                  lower(COALESCE(NULLIF("utmMedium", ''), NULLIF(medium, ''), '')) AS med,
                  COUNT(*)::int AS cnt
             FROM "PageView"
            WHERE "createdAt" >= $1
              AND source = ANY($2::text[])
            GROUP BY 1, 2`,
          from,
          sources,
        ),
        // (2) Top 3 utmCampaign per source (window function)
        prisma.$queryRawUnsafe<any[]>(
          `SELECT source, campaign, cnt FROM (
             SELECT source,
                    "utmCampaign" AS campaign,
                    COUNT(*)::int AS cnt,
                    ROW_NUMBER() OVER (PARTITION BY source ORDER BY COUNT(*) DESC) AS rn
               FROM "PageView"
              WHERE "createdAt" >= $1
                AND source = ANY($2::text[])
                AND "utmCampaign" IS NOT NULL
                AND "utmCampaign" <> ''
              GROUP BY 1, 2
           ) sub
           WHERE rn <= 3
           ORDER BY source, rn`,
          from,
          sources,
        ),
        // (3) Top 3 landing path per source (window function)
        prisma.$queryRawUnsafe<any[]>(
          `SELECT source, path, cnt FROM (
             SELECT source,
                    path,
                    COUNT(*)::int AS cnt,
                    ROW_NUMBER() OVER (PARTITION BY source ORDER BY COUNT(*) DESC) AS rn
               FROM "PageView"
              WHERE "createdAt" >= $1
                AND source = ANY($2::text[])
              GROUP BY 1, 2
           ) sub
           WHERE rn <= 3
           ORDER BY source, rn`,
          from,
          sources,
        ),
      ])

      const paidSet = new Set(PAID_MEDIUMS_ARR)

      // per-source 집계
      const bySource = new Map<TrafficSource, ReturnType<typeof emptyResult>>()
      for (const s of sources) bySource.set(s, emptyResult(s))

      for (const r of mediumRows as any[]) {
        const s = r.source as TrafficSource
        const bucket = bySource.get(s)
        if (!bucket) continue
        const cnt = Number(r.cnt ?? 0)
        const med = String(r.med ?? '').toLowerCase()
        if (paidSet.has(med)) bucket.paid += cnt
        else bucket.organic += cnt
        bucket.total += cnt
      }

      for (const r of campaignRows as any[]) {
        const s = r.source as TrafficSource
        const bucket = bySource.get(s)
        if (!bucket) continue
        bucket.topCampaigns.push({
          campaign: String(r.campaign),
          count: Number(r.cnt ?? 0),
        })
      }

      for (const r of landingRows as any[]) {
        const s = r.source as TrafficSource
        const bucket = bySource.get(s)
        if (!bucket) continue
        bucket.topLandingPages.push({
          path: String(r.path),
          count: Number(r.cnt ?? 0),
        })
      }

      return sources.map(s => bySource.get(s) ?? emptyResult(s))
    } catch {
      return sources.map(emptyResult)
    }
  },
  ['traffic:source-details-bulk'],
  { revalidate: 30, tags: ['traffic'] },
)

/** @deprecated 단일 소스용. 여러 개 필요시 getSourceDetailsBulk 사용. */
export async function getSourceDetail(range: Range, source: TrafficSource) {
  const [result] = await getSourceDetailsBulk(range, [source])
  return {
    ...result,
    daily: [] as { day: string; paid: number; organic: number }[],
  }
}

/** UTM 캠페인 전체 Top N (30초 캐시) */
export const getTopCampaigns = unstable_cache(
  async (range: Range, take = 15) => {
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
  },
  ['traffic:top-campaigns'],
  { revalidate: 30, tags: ['traffic'] },
)

/** 레퍼럴 상세 Top N (30초 캐시) */
export const getReferrerDomains = unstable_cache(
  async (range: Range, take = 15) => {
    const client = pv()
    if (!client) return [] as { domain: string; count: number }[]
    const from = rangeStart(range)
    try {
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
  },
  ['traffic:referrer-domains'],
  { revalidate: 30, tags: ['traffic'] },
)

/** 광고 캠페인 요약 (30초 캐시) — UV는 COUNT(DISTINCT) raw SQL */
export const getPaidSummary = unstable_cache(
  async (range: Range) => {
    const client = pv()
    if (!client) return { paidPv: 0, paidUv: 0, topCampaigns: [] as { campaign: string; source: string; count: number }[] }
    const from = rangeStart(range)
    try {
      const [pvCount, paidUv, campaigns] = await Promise.all([
        client.count({
          where: {
            createdAt: { gte: from },
            OR: [
              { utmMedium: { in: PAID_MEDIUMS_ARR } },
              { medium: { in: PAID_MEDIUMS_ARR } },
            ],
          },
        }),
        // UV: DB 단 COUNT(DISTINCT)
        countDistinctSessions(
          `"createdAt" >= $1 AND (lower("utmMedium") = ANY($2::text[]) OR lower(medium) = ANY($2::text[]))`,
          from,
          PAID_MEDIUMS_ARR,
        ),
        client.groupBy({
          by: ['utmCampaign', 'utmSource'],
          where: {
            createdAt: { gte: from },
            utmCampaign: { not: null },
            OR: [
              { utmMedium: { in: PAID_MEDIUMS_ARR } },
              { medium: { in: PAID_MEDIUMS_ARR } },
            ],
          },
          _count: { _all: true },
          orderBy: { _count: { utmCampaign: 'desc' } },
          take: 10,
        }),
      ])
      return {
        paidPv: pvCount,
        paidUv,
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
  },
  ['traffic:paid-summary'],
  { revalidate: 30, tags: ['traffic'] },
)
