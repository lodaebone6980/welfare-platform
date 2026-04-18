import { prisma } from '@/lib/prisma'

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
