// 중앙 환경변수 래퍼 — 사이트 URL/브랜드/분석 ID 등
// 서버·클라이언트 공용 상수는 NEXT_PUBLIC_ prefix로 읽고, 아니면 process.env로.

const DEFAULT_SITE_URL = 'https://govmate.co.kr'

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || DEFAULT_SITE_URL

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '복지길잡이'
export const SITE_DESC =
  process.env.NEXT_PUBLIC_SITE_DESC ||
  '2026년 최신 정부 지원금·복지·보조금·환급금 정보를 한눈에. 나에게 맞는 정책을 추천해드립니다.'

// 분석·광고
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || ''
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''
export const NAVER_WCS_ID = process.env.NEXT_PUBLIC_NAVER_WCS || ''
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL || ''
export const KAKAO_PIXEL_ID = process.env.NEXT_PUBLIC_KAKAO_PIXEL || ''

// Search Console / Webmaster 소유 확인
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION || ''
export const NAVER_SITE_VERIFICATION = process.env.NAVER_SITE_VERIFICATION || ''
export const BING_SITE_VERIFICATION = process.env.BING_SITE_VERIFICATION || ''

// 내부 트래커 토글
export const INTERNAL_TRACKER_ENABLED =
  (process.env.NEXT_PUBLIC_INTERNAL_TRACKER ?? '1') !== '0'

export function absoluteUrl(pathname: string = '/'): string {
  const base = SITE_URL
  if (pathname.startsWith('http')) return pathname
  return base + (pathname.startsWith('/') ? pathname : '/' + pathname)
}
