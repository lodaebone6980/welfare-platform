'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'

type SourceRow = { source: string; label: string; count: number }
type DeviceRow = { device: string; count: number }
type PlatformRow = { platform: string; count: number }
type DailyRow = { day: string; source: string; count: number }

const COLORS = [
  '#16a34a', // green
  '#2563eb', // blue
  '#f59e0b', // amber
  '#dc2626', // red
  '#0ea5e9', // sky
  '#7c3aed', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#9ca3af', // gray
  '#f97316', // orange
]

export default function TrafficCharts({
  sources,
  devices,
  platforms,
  daily,
  totalRange,
  range,
}: {
  sources: SourceRow[]
  devices: DeviceRow[]
  platforms: PlatformRow[]
  daily: DailyRow[]
  totalRange: number
  range: string
}) {
  // 도넛 데이터(상위 8개 + 기타 합산)
  const donutData = useMemo(() => {
    if (sources.length <= 8) return sources
    const top = sources.slice(0, 8)
    const rest = sources.slice(8).reduce((a, b) => a + b.count, 0)
    return [...top, { source: 'others', label: '기타', count: rest }]
  }, [sources])

  // 일별 누적 영역 차트 데이터
  const dailyChart = useMemo(() => {
    const dayMap = new Map<string, Record<string, number>>()
    const sourceSet = new Set<string>()
    daily.forEach(r => {
      const row = dayMap.get(r.day) ?? {}
      row[r.source] = (row[r.source] ?? 0) + r.count
      dayMap.set(r.day, row)
      sourceSet.add(r.source)
    })
    // 상위 5개 소스만 보여주고 나머지는 others로 합산
    const sourceTotals = new Map<string, number>()
    sourceSet.forEach(s => {
      let sum = 0
      dayMap.forEach(row => {
        sum += row[s] ?? 0
      })
      sourceTotals.set(s, sum)
    })
    const topSources = Array.from(sourceTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(pair => pair[0])

    const days = Array.from(dayMap.keys()).sort()
    const data = days.map(day => {
      const row: Record<string, number | string> = { day }
      let others = 0
      const dayRow = dayMap.get(day) ?? {}
      Object.keys(dayRow).forEach(s => {
        if (topSources.includes(s)) {
          row[s] = dayRow[s]
        } else {
          others += dayRow[s]
        }
      })
      if (others > 0) row['others'] = others
      return row
    })
    const stackKeys = hasOthers(daily, topSources)
      ? topSources.concat('others')
      : topSources
    return { data, stackKeys }
  }, [daily])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 도넛 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 lg:col-span-1">
        <div className="text-xs font-medium text-gray-600 mb-3">포털·소스별 유입 비율</div>
        {donutData.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">데이터 없음</div>
        ) : (
          <>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {donutData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${Number(value).toLocaleString()}회`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {donutData.map((s, idx) => {
                const pct = totalRange > 0 ? (s.count / totalRange) * 100 : 0
                return (
                  <div key={s.source} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    />
                    <span className="flex-1 text-gray-600 truncate">{s.label}</span>
                    <span className="text-gray-400">{pct.toFixed(1)}%</span>
                    <span className="text-gray-500 w-12 text-right">{s.count.toLocaleString()}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 영역 차트 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 lg:col-span-2">
        <div className="text-xs font-medium text-gray-600 mb-3">일별 소스별 유입 추이 ({range})</div>
        {dailyChart.data.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">데이터 없음</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${Number(value).toLocaleString()}회`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e5e7eb' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {dailyChart.stackKeys.map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={COLORS[idx % COLORS.length]}
                    fill={COLORS[idx % COLORS.length]}
                    fillOpacity={0.4}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 디바이스 + 플랫폼 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 lg:col-span-1">
        <div className="text-xs font-medium text-gray-600 mb-3">디바이스 분포</div>
        <BarBreakdown rows={devices.map(d => ({ key: d.device, label: deviceLabel(d.device), count: d.count }))} />
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-4 lg:col-span-2">
        <div className="text-xs font-medium text-gray-600 mb-3">플랫폼 분포 (웹 vs 앱)</div>
        <BarBreakdown rows={platforms.map(p => ({ key: p.platform, label: platformLabel(p.platform), count: p.count }))} />
      </div>
    </div>
  )
}

function hasOthers(daily: DailyRow[], topSources: string[]): boolean {
  const set = new Set(topSources)
  for (let i = 0; i < daily.length; i++) {
    if (!set.has(daily[i].source)) return true
  }
  return false
}

function deviceLabel(d: string) {
  if (d === 'mobile') return '모바일'
  if (d === 'tablet') return '태블릿'
  if (d === 'desktop') return 'PC(데스크톱)'
  return d || '기타'
}

function platformLabel(p: string) {
  if (p === 'web') return '웹'
  if (p === 'app') return '앱(WebView/일반)'
  if (p === 'app_ios') return '앱 (iOS)'
  if (p === 'app_android') return '앱 (Android)'
  return p || '기타'
}

function BarBreakdown({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  const total = rows.reduce((a, b) => a + b.count, 0)
  if (total === 0) return <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>
  return (
    <div className="space-y-2">
      {rows.map((r, idx) => {
        const pct = (r.count / total) * 100
        return (
          <div key={r.key} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-gray-500 flex-shrink-0">{r.label}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: COLORS[idx % COLORS.length] }}
              />
            </div>
            <span className="text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
            <span className="text-gray-600 w-12 text-right">{r.count.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}
