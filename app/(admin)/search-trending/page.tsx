import { Suspense } from 'react'

// force-dynamic 제거: Link prefetch 활성화
export const revalidate = 600

type FeedItem = {
  title: string
  link: string
  pubDate: string
  source: string
}

type FeedMeta = {
  key: string
  label: string
  emoji: string
  q: string
}

const KEYWORDS: FeedMeta[] = [
  { key: 'welfare', label: '복지 전반', emoji: '🤝', q: '복지' },
  { key: 'support', label: '지원금', emoji: '💰', q: '지원금' },
  { key: 'policy', label: '정부 정책', emoji: '🏛️', q: '정부 정책' },
  { key: 'youth', label: '청년 지원', emoji: '👤', q: '청년 지원' },
  { key: 'senior', label: '기초연금 · 노인', emoji: '👴', q: '기초연금' },
  { key: 'parenting', label: '육아 · 출산', emoji: '👶', q: '육아 지원' },
]

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  if (!m) return ''
  let v = m[1]
  const cdata = v.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdata) v = cdata[1]
  return decodeEntities(v.trim())
}

async function fetchNewsRSS(keyword: string): Promise<FeedItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`
  const res = await fetch(url, { next: { revalidate: 600 } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const items: FeedItem[] = []
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)
  for (const m of matches) {
    const block = m[1]
    items.push({
      title: extractTag(block, 'title'),
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      source: extractTag(block, 'source'),
    })
    if (items.length >= 10) break
  }
  return items
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function FeedCardSkeleton({ meta }: { meta: FeedMeta }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">
            <span className="mr-1.5">{meta.emoji}</span>{meta.label}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Google News RSS · "{meta.q}"</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}

async function FeedCard({ meta }: { meta: FeedMeta }) {
  let items: FeedItem[] = []
  let error: string | null = null
  try {
    items = await fetchNewsRSS(meta.q)
  } catch (e: any) {
    error = e?.message ?? 'fetch error'
  }
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-800 text-sm">
            <span className="mr-1.5">{meta.emoji}</span>{meta.label}
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate">Google News RSS · "{meta.q}"</p>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
          {items.length}건
        </span>
      </div>

      {error ? (
        <p className="text-xs text-red-500 py-2 bg-red-50 rounded px-2">수집 실패: {error}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">데이터 없음</p>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 6).map((it, i) => (
            <li key={i} className="text-sm">
              <a
                href={it.link}
                target="_blank"
                rel="noreferrer"
                className="text-gray-800 hover:text-blue-600 line-clamp-2 leading-snug"
                title={it.title}
              >
                <span className="text-gray-400 mr-1">#{i + 1}</span>
                {it.title}
              </a>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                {it.source && <span className="truncate max-w-[120px]">{it.source}</span>}
                {it.source && it.pubDate && <span>·</span>}
                {it.pubDate && <time>{formatDate(it.pubDate)}</time>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SearchTrendingPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-800">🔥 검색트렌딩</h1>
        <p className="text-xs text-gray-500 mt-1">
          Google News RSS 를 수집해 복지·지원금·정책 관련 최신 트렌드를 보여드립니다. · 10분 캐시 · 피드별로 개별 스트리밍
        </p>
      </div>

      {/* 각 피드를 독립 Suspense 로 감싸 → 가장 빠른 피드부터 순차적으로 화면에 뜸 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {KEYWORDS.map(meta => (
          <Suspense key={meta.key} fallback={<FeedCardSkeleton meta={meta} />}>
            <FeedCard meta={meta} />
          </Suspense>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
        <p className="font-medium mb-1">💡 확장 예정</p>
        <ul className="list-disc pl-5 space-y-0.5 text-blue-600">
          <li>구글 트렌드 데이터랩 API 연동 → 검색량 지수 + 연관 검색어</li>
          <li>네이버 검색광고 키워드도구 → 월간 검색량 연동</li>
          <li>"이 키워드로 정책 초안 만들기" 버튼 → 자동 DRAFT 생성</li>
          <li>키워드별 검색량 차트 (최근 7일/30일)</li>
          <li>Google Search Console 연동 (웹마스터 도구 완료 후)</li>
        </ul>
      </div>
    </div>
  )
}
