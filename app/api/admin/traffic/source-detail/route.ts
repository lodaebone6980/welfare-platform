import { NextRequest, NextResponse } from 'next/server'
import { getSourceDetailsBulk, type Range } from '@/lib/traffic-stats'
import type { TrafficSource } from '@/lib/tracking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_RANGES: Range[] = ['24h', '7d', '30d', '90d']

// 어드민 전용 — middleware 가 /api/admin/* 을 JWT 로 보호
const DEFAULT_SOURCES: TrafficSource[] = [
  'google', 'naver', 'x', 'threads', 'instagram',
  'facebook', 'youtube', 'tiktok', 'kakao',
]

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get('range') ?? '7d'
  const range: Range = (VALID_RANGES as string[]).includes(rangeParam)
    ? (rangeParam as Range)
    : '7d'

  const sourcesParam = req.nextUrl.searchParams.get('sources')
  const sources: TrafficSource[] = sourcesParam
    ? (sourcesParam.split(',').map(s => s.trim()).filter(Boolean) as TrafficSource[])
    : DEFAULT_SOURCES

  const data = await getSourceDetailsBulk(range, sources)
  return NextResponse.json({ range, sources, data })
}
