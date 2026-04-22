import { SITE_URL } from '@/lib/env'

/**
 * 검색엔진 즉시 색인 알림 헬퍼.
 * - notifySearchIndex(slugs): 정책 발행/수정 시 호출
 * - 내부적으로 /api/indexnow 를 호출 → Bing/Yandex/Naver(예정) 핑
 * - 키 미설정/실패 시 throw 하지 않고 false 반환 (발행 흐름을 절대 깨지 않음)
 *
 * 사용 예:
 *   import { notifySearchIndex } from '@/lib/notify-search'
 *   await notifySearchIndex(['my-policy-slug'])
 */

export interface NotifyOptions {
  baseUrl?: string // 서버사이드에서 절대 URL 호출용 (옵션)
  timeoutMs?: number
}

function policyUrls(slugs: string[]): string[] {
  return slugs
    .filter((s) => typeof s === 'string' && s.length > 0)
    .map((s) => `${SITE_URL}/welfare/${encodeURIComponent(s)}`)
}

export async function notifySearchIndex(
  slugs: string[],
  opts: NotifyOptions = {}
): Promise<{ ok: boolean; submitted: number; error?: string }> {
  const urls = policyUrls(slugs)
  if (urls.length === 0) return { ok: false, submitted: 0, error: 'empty' }

  const base = opts.baseUrl || SITE_URL
  const endpoint = `${base.replace(/\/$/, '')}/api/indexnow`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8_000)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      return { ok: false, submitted: urls.length, error: `HTTP ${res.status}: ${t.slice(0, 200)}` }
    }
    return { ok: true, submitted: urls.length }
  } catch (err: any) {
    return {
      ok: false,
      submitted: urls.length,
      error: err?.name === 'AbortError' ? 'timeout' : String(err?.message || err),
    }
  } finally {
    clearTimeout(t)
  }
}

/** 추가 URL (지역 랜딩, 카테고리 등)도 같이 핑 */
export async function notifySearchUrls(
  urls: string[],
  opts: NotifyOptions = {}
) {
  const filtered = urls.filter((u) => u.startsWith(SITE_URL))
  if (filtered.length === 0) return { ok: false, submitted: 0, error: 'empty' }
  const base = opts.baseUrl || SITE_URL
  const endpoint = `${base.replace(/\/$/, '')}/api/indexnow`
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: filtered }),
    })
    return { ok: res.ok, submitted: filtered.length }
  } catch (err: any) {
    return { ok: false, submitted: filtered.length, error: String(err?.message || err) }
  }
}
