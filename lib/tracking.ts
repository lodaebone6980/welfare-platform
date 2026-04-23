// 유입 소스 · 디바이스 · 플랫폼 · UTM 분류 유틸
// 클라이언트(브라우저)와 서버(API 라우트) 양쪽에서 사용 가능.

export type TrafficSource =
  | 'direct'
  | 'google'
  | 'naver'
  | 'bing'
  | 'daum'
  | 'yahoo'
  | 'yandex'
  | 'facebook'
  | 'threads'
  | 'x'
  | 'instagram'
  | 'kakao'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'reddit'
  | 'other'

export type Device = 'mobile' | 'tablet' | 'desktop'
export type Platform = 'web' | 'app' | 'app_ios' | 'app_android'

const SOURCE_MAP: Array<{ pattern: RegExp; source: TrafficSource }> = [
  { pattern: /(^|\.)google\./i,                       source: 'google' },
  { pattern: /(^|\.)naver\./i,                        source: 'naver' },
  { pattern: /(^|\.)bing\./i,                         source: 'bing' },
  { pattern: /(^|\.)daum\./i,                         source: 'daum' },
  { pattern: /(^|\.)kakao\./i,                        source: 'kakao' },
  { pattern: /(^|\.)yahoo\./i,                        source: 'yahoo' },
  { pattern: /(^|\.)yandex\./i,                       source: 'yandex' },
  { pattern: /(^|\.)(facebook|fb)\./i,                source: 'facebook' },
  { pattern: /(^|\.)threads\.net/i,                   source: 'threads' },
  { pattern: /(^|\.)(x\.com|twitter\.com|t\.co)/i,    source: 'x' },
  { pattern: /(^|\.)instagram\./i,                    source: 'instagram' },
  { pattern: /(^|\.)(youtube\.|youtu\.be)/i,          source: 'youtube' },
  { pattern: /(^|\.)tiktok\./i,                       source: 'tiktok' },
  { pattern: /(^|\.)linkedin\./i,                     source: 'linkedin' },
  { pattern: /(^|\.)reddit\./i,                       source: 'reddit' },
  // 별칭/서브도메인 보강
  { pattern: /(^|\.)(lm|l|m)\.facebook\.com/i,        source: 'facebook' },
  { pattern: /(^|\.)l\.instagram\.com/i,              source: 'instagram' },
  { pattern: /(^|\.)(m|search)\.naver\.com/i,         source: 'naver' },
  { pattern: /(^|\.)search\.daum\.net/i,              source: 'daum' },
  { pattern: /(^|\.)news\.google\.com/i,              source: 'google' },
]

/**
 * 세부 채널 분류 (paid/organic × 소스).
 * utm_source · utm_medium · 분류된 source 조합으로 세분화된 채널을 반환한다.
 */
export type Channel =
  | 'paid_search_google'
  | 'paid_search_naver'
  | 'paid_search_bing'
  | 'paid_social_meta'
  | 'paid_social_tiktok'
  | 'paid_social_kakao'
  | 'paid_social_linkedin'
  | 'paid_display_google'
  | 'organic_search_google'
  | 'organic_search_naver'
  | 'organic_search_bing'
  | 'organic_search_daum'
  | 'organic_search_other'
  | 'social_organic_threads'
  | 'social_organic_x'
  | 'social_organic_instagram'
  | 'social_organic_facebook'
  | 'social_organic_youtube'
  | 'social_organic_kakao'
  | 'social_organic_tiktok'
  | 'social_organic_other'
  | 'direct'
  | 'referral'
  | 'email'
  | 'other'

const PAID_MEDIUMS = new Set([
  'cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-search',
  'paid_social', 'paid-social', 'paidsocial',
  'display', 'cpm', 'cpv', 'cpa', 'cpi',
])

export function classifyChannel(opts: {
  source: TrafficSource
  medium?: string | null
  utmSource?: string | null
  utmMedium?: string | null
}): Channel {
  const src = (opts.utmSource || opts.source || '').toLowerCase()
  const med = (opts.utmMedium || opts.medium || '').toLowerCase()

  if (opts.source === 'direct' && !opts.utmSource && !opts.utmMedium) return 'direct'
  if (med === 'email' || med === 'newsletter') return 'email'

  const isPaid = PAID_MEDIUMS.has(med)

  if (isPaid) {
    if ((med === 'display' || med === 'cpm' || med === 'cpv') && src.includes('google')) {
      return 'paid_display_google'
    }
    if (src.includes('google'))   return 'paid_search_google'
    if (src.includes('naver'))    return 'paid_search_naver'
    if (src.includes('bing'))     return 'paid_search_bing'
    if (src.includes('facebook') || src.includes('instagram') || src.includes('meta')) return 'paid_social_meta'
    if (src.includes('tiktok'))   return 'paid_social_tiktok'
    if (src.includes('kakao'))    return 'paid_social_kakao'
    if (src.includes('linkedin')) return 'paid_social_linkedin'
    return 'other'
  }

  // 유기적 검색
  if (opts.source === 'google') return 'organic_search_google'
  if (opts.source === 'naver')  return 'organic_search_naver'
  if (opts.source === 'bing')   return 'organic_search_bing'
  if (opts.source === 'daum')   return 'organic_search_daum'
  if (opts.source === 'yahoo' || opts.source === 'yandex') return 'organic_search_other'

  // 유기적 소셜
  if (opts.source === 'threads')   return 'social_organic_threads'
  if (opts.source === 'x')         return 'social_organic_x'
  if (opts.source === 'instagram') return 'social_organic_instagram'
  if (opts.source === 'facebook')  return 'social_organic_facebook'
  if (opts.source === 'youtube')   return 'social_organic_youtube'
  if (opts.source === 'kakao')     return 'social_organic_kakao'
  if (opts.source === 'tiktok')    return 'social_organic_tiktok'
  if (opts.source === 'linkedin' || opts.source === 'reddit') return 'social_organic_other'

  if (opts.source === 'other') return 'referral'
  return 'other'
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  paid_search_google:   '유료 검색 · 구글',
  paid_search_naver:    '유료 검색 · 네이버',
  paid_search_bing:     '유료 검색 · 빙',
  paid_social_meta:     '유료 소셜 · Meta(FB/IG)',
  paid_social_tiktok:   '유료 소셜 · 틱톡',
  paid_social_kakao:    '유료 소셜 · 카카오',
  paid_social_linkedin: '유료 소셜 · 링크드인',
  paid_display_google:  '유료 디스플레이 · 구글',
  organic_search_google: '자연 검색 · 구글',
  organic_search_naver:  '자연 검색 · 네이버',
  organic_search_bing:   '자연 검색 · 빙',
  organic_search_daum:   '자연 검색 · 다음',
  organic_search_other:  '자연 검색 · 기타',
  social_organic_threads:   '소셜 · Threads',
  social_organic_x:         '소셜 · X(트위터)',
  social_organic_instagram: '소셜 · 인스타그램',
  social_organic_facebook:  '소셜 · 페이스북',
  social_organic_youtube:   '소셜 · 유튜브',
  social_organic_kakao:     '소셜 · 카카오',
  social_organic_tiktok:    '소셜 · 틱톡',
  social_organic_other:     '소셜 · 기타',
  direct:   '직접 방문',
  referral: '레퍼럴',
  email:    '이메일',
  other:    '기타',
}

export function isPaidChannel(c: Channel): boolean {
  return c.startsWith('paid_')
}
export function isOrganicSearchChannel(c: Channel): boolean {
  return c.startsWith('organic_search_')
}
export function isSocialOrganicChannel(c: Channel): boolean {
  return c.startsWith('social_organic_')
}

/**
 * referrer URL 또는 utm_source 값을 받아 정규화된 트래픽 소스를 반환.
 * 같은 도메인 referrer는 direct(내부 이동)로 간주하도록 호출측에서 처리.
 */
export function classifySource(opts: {
  referrer?: string | null
  utmSource?: string | null
  currentHost?: string | null
}): TrafficSource {
  const utm = (opts.utmSource || '').toLowerCase().trim()
  if (utm) {
    const direct = SOURCE_MAP.find(m => m.pattern.test('.' + utm + '.'))
    if (direct) return direct.source
    if (utm === 'direct' || utm === '(direct)') return 'direct'
    return 'other'
  }

  const ref = (opts.referrer || '').trim()
  if (!ref) return 'direct'

  let host = ''
  try { host = new URL(ref).hostname } catch { host = '' }
  if (!host) return 'direct'

  // 내부 호스트 → direct 취급 (호출자가 보정)
  if (opts.currentHost && host === opts.currentHost) return 'direct'
  if (opts.currentHost && host.endsWith('.' + opts.currentHost)) return 'direct'

  for (const { pattern, source } of SOURCE_MAP) {
    if (pattern.test('.' + host + '.')) return source
  }
  return 'other'
}

export function classifyMedium(source: TrafficSource): string {
  switch (source) {
    case 'direct': return 'direct'
    case 'google':
    case 'naver':
    case 'bing':
    case 'daum':
    case 'yahoo':
    case 'yandex': return 'organic'
    case 'facebook':
    case 'threads':
    case 'x':
    case 'instagram':
    case 'kakao':
    case 'youtube':
    case 'tiktok':
    case 'linkedin':
    case 'reddit': return 'social'
    default: return 'referral'
  }
}

/**
 * User-Agent 문자열에서 디바이스/OS/브라우저를 추정한다.
 * 서버(API 라우트)에서 req.headers['user-agent']를, 클라에선 navigator.userAgent를 전달.
 */
export function parseUserAgent(ua: string | null | undefined) {
  const u = (ua || '').toLowerCase()

  // 디바이스
  let device: Device = 'desktop'
  const tabletHints = /(ipad|tablet|playbook|silk|kindle|sm-t|nexus 7|nexus 10)/i
  const mobileHints = /(mobile|iphone|ipod|android.*mobile|opera m(ob|in)i|windows phone)/i
  if (tabletHints.test(u)) device = 'tablet'
  else if (mobileHints.test(u)) device = 'mobile'
  else if (/android/i.test(u)) device = 'mobile' // android tablet은 보통 드물어서 mobile로 fallback

  // OS
  let os: string = 'Other'
  if (/(iphone|ipad|ipod)/i.test(u)) os = 'iOS'
  else if (/android/i.test(u)) os = 'Android'
  else if (/windows/i.test(u)) os = 'Windows'
  else if (/mac os x|macintosh/i.test(u)) os = 'macOS'
  else if (/linux/i.test(u)) os = 'Linux'

  // 브라우저
  let browser: string = 'Other'
  if (/edg\//i.test(u)) browser = 'Edge'
  else if (/samsungbrowser/i.test(u)) browser = 'Samsung Internet'
  else if (/naver\(inapp/i.test(u) || /whale\//i.test(u)) browser = 'Naver Whale'
  else if (/kakaotalk/i.test(u)) browser = 'KakaoTalk InApp'
  else if (/opr\//i.test(u) || /opera/i.test(u)) browser = 'Opera'
  else if (/firefox/i.test(u)) browser = 'Firefox'
  else if (/chrome\//i.test(u)) browser = 'Chrome'
  else if (/safari/i.test(u)) browser = 'Safari'

  return { device, os, browser }
}

/**
 * 플랫폼(웹/앱) 판별
 * 1) ?src=app 쿼리파라미터가 있으면 앱
 * 2) UA에 'GovMateApp' 등 커스텀 마커가 있으면 앱
 * 3) iOS/Android 기본 브라우저는 web이지만 WebView 내 앱 감지가 있으면 app
 */
export function classifyPlatform(opts: {
  srcParam?: string | null
  userAgent?: string | null
  os?: string
}): Platform {
  const src = (opts.srcParam || '').toLowerCase()
  if (src === 'app' || src === 'ios' || src === 'android') {
    if (opts.os === 'iOS' || src === 'ios') return 'app_ios'
    if (opts.os === 'Android' || src === 'android') return 'app_android'
    return 'app'
  }
  const ua = (opts.userAgent || '').toLowerCase()
  if (/govmateapp|welfareapp|wv\)|version\/[\d.]+.+mobile\/.+safari.{0,5}\b/i.test(ua)) {
    // WebView 휴리스틱
    if (/iphone|ipad|ipod/i.test(ua)) return 'app_ios'
    if (/android/i.test(ua)) return 'app_android'
  }
  return 'web'
}

/** 간단한 경로 정규화 (쿼리 제거, trailing slash 통일) */
export function normalizePath(input: string): string {
  if (!input) return '/'
  try {
    const u = new URL(input, 'https://x.local')
    let p = u.pathname || '/'
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
    return p
  } catch {
    return input.split('?')[0] || '/'
  }
}

/** 한글·특수문자 경로 디코딩 */
export function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}
