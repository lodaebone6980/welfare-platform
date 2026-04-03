export type Format = 'checklist' | 'qa' | 'story' | 'number' | 'compilation' | 'cardnews'
export type Verdict = 'REWARD' | 'PUNISHMENT' | 'NEUTRAL'

interface PostMetrics {
  views:    number
  likes:    number
  comments: number
  shares:   number
  format:   Format
}

// REWARD/PUNISHMENT/NEUTRAL 판정
// govhelp.co.kr 실제 운영 기준 역분석
export function calcVerdict(m: PostMetrics): Verdict {
  const engagementRate = m.views > 0
    ? (m.likes + m.comments * 2 + m.shares * 3) / m.views
    : 0

  if (engagementRate >= 0.01 || m.comments >= 2) return 'REWARD'
  if (m.views < 30 && m.comments === 0)           return 'PUNISHMENT'
  return 'NEUTRAL'
}

// 포맷별 평균 성과 집계
export function calcFormatStats(posts: (PostMetrics & { verdict: Verdict })[]) {
  const grouped: Record<string, PostMetrics[]> = {}

  for (const post of posts) {
    if (!grouped[post.format]) grouped[post.format] = []
    grouped[post.format].push(post)
  }

  return Object.entries(grouped).map(([format, items]) => ({
    format:        format as Format,
    count:         items.length,
    avgViews:      Math.round(items.reduce((a, b) => a + b.views, 0) / items.length),
    avgEngagement: +(items.reduce((a, b) => {
      return a + (b.views > 0 ? (b.likes + b.comments * 2) / b.views : 0)
    }, 0) / items.length * 100).toFixed(1),
    rewardRate:    +(items.filter(i => calcVerdict(i) === 'REWARD').length / items.length * 100).toFixed(0),
  })).sort((a, b) => b.avgViews - a.avgViews)
}

// 다음 발행 포맷 추천 (상위 2개 랜덤 교대 — 한 포맷만 반복하면 알고리즘 페널티)
export function recommendNextFormat(
  stats: ReturnType<typeof calcFormatStats>
): Format {
  if (stats.length === 0) return 'checklist'
  const top2 = stats.slice(0, 2)
  return top2[Math.floor(Math.random() * top2.length)].format
}

// 기본 성과 데이터 (govhelp.co.kr 역분석 — 초기 데이터 없을 때 사용)
export const DEFAULT_STATS = [
  { format: 'checklist'   as Format, count: 7,  avgViews: 233, avgEngagement: 1.5,  rewardRate: 71 },
  { format: 'qa'          as Format, count: 1,  avgViews: 167, avgEngagement: 1.2,  rewardRate: 100 },
  { format: 'number'      as Format, count: 3,  avgViews: 112, avgEngagement: 10.4, rewardRate: 67 },
  { format: 'story'       as Format, count: 6,  avgViews: 69,  avgEngagement: 5.9,  rewardRate: 83 },
  { format: 'cardnews'    as Format, count: 1,  avgViews: 61,  avgEngagement: 3.3,  rewardRate: 100 },
  { format: 'compilation' as Format, count: 8,  avgViews: 20,  avgEngagement: 0.0,  rewardRate: 0 },
]
