import { NextResponse } from 'next/server'

/**
 * GET /api/admin/diagnostics/env
 * 관리자 보호는 /middleware.ts 에서 JWT 세션으로 처리.
 *
 * 각 환경변수가 Vercel 런타임에서 실제로 로드되었는지 확인한다.
 * 값은 절대 노출하지 않고, 존재 여부(boolean)와 길이만 반환.
 * (길이 공개는 오탈자 감지용 — 실제 값 유추는 불가능)
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const KEYS = [
  // 네이버 (검색 API 및 뉴스)
  'NAVER_CLIENT_ID',
  'NAVER_CLIENT_SECRET',
  // NextAuth
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'KAKAO_CLIENT_ID',
  'KAKAO_CLIENT_SECRET',
  'ADMIN_EMAILS',
  'ADMIN_PASSWORD_HASH',
  // DB
  'DATABASE_URL',
  'DIRECT_URL',
  // OpenAI (Threads 생성 등)
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  // Threads
  'THREADS_USER_ID',
  'THREADS_ACCESS_TOKEN',
  // Meta(Facebook/Instagram) 광고
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_ID',
  // Google Ads
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CUSTOMER_ID',
  // 공공데이터 포털
  'DATA_GO_KR_KEY',
  'DATA_GO_KR_API_KEY',
  // Cron · Indexing
  'CRON_SECRET',
  'INDEXING_PUSH_SECRET',
  'INDEXNOW_KEY',
  'GOOGLE_INDEXING_CLIENT_EMAIL',
  'GOOGLE_INDEXING_PRIVATE_KEY',
  // FCM / Firebase (앱 푸시)
  'FCM_SERVER_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  // Cloudflare R2 (이미지 호스팅)
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_ENDPOINT',
  // 프론트용 공개 키
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_INTERNAL_TRACKER',
] as const

type KeyName = typeof KEYS[number]

type EnvCheck = {
  key: KeyName
  present: boolean
  length: number
  /** 값의 앞뒤 공백/따옴표/줄바꿈 존재 여부 (오탈자 감지) */
  hasWhitespace: boolean
  hasQuotes: boolean
  hasNewline: boolean
}

export async function GET() {
  const results: EnvCheck[] = KEYS.map((key) => {
    const raw = process.env[key]
    const val = typeof raw === 'string' ? raw : ''
    return {
      key,
      present: val.length > 0,
      length: val.length,
      hasWhitespace: val !== val.trim(),
      hasQuotes: val.startsWith('"') || val.endsWith('"') || val.startsWith("'") || val.endsWith("'"),
      hasNewline: val.includes('\n') || val.includes('\r'),
    }
  })

  const grouped = {
    naver: results.filter(r => r.key.startsWith('NAVER_')),
    auth: results.filter(r => r.key.startsWith('NEXTAUTH_') || r.key.startsWith('KAKAO_') || r.key.startsWith('ADMIN_')),
    db: results.filter(r => r.key === 'DATABASE_URL' || r.key === 'DIRECT_URL'),
    openai: results.filter(r => r.key.startsWith('OPENAI_')),
    threads: results.filter(r => r.key.startsWith('THREADS_')),
    meta: results.filter(r => r.key.startsWith('META_')),
    google_ads: results.filter(r => r.key.startsWith('GOOGLE_ADS_')),
    data_gov: results.filter(r => r.key.startsWith('DATA_GO_KR_')),
    cron_indexing: results.filter(r => r.key === 'CRON_SECRET' || r.key.startsWith('INDEXING_') || r.key.startsWith('INDEXNOW_') || r.key.startsWith('GOOGLE_INDEXING_')),
    firebase: results.filter(r => r.key.startsWith('FCM_') || r.key.startsWith('NEXT_PUBLIC_FIREBASE_')),
    r2: results.filter(r => r.key.startsWith('R2_')),
    public: results.filter(r => r.key === 'NEXT_PUBLIC_SITE_URL' || r.key === 'NEXT_PUBLIC_INTERNAL_TRACKER'),
  }

  return NextResponse.json({
    ok: true,
    runtimeEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    vercelRegion: process.env.VERCEL_REGION ?? null,
    checkedAt: new Date().toISOString(),
    total: results.length,
    presentCount: results.filter(r => r.present).length,
    missingKeys: results.filter(r => !r.present).map(r => r.key),
    issues: results
      .filter(r => r.present && (r.hasWhitespace || r.hasQuotes || r.hasNewline))
      .map(r => ({
        key: r.key,
        hasWhitespace: r.hasWhitespace,
        hasQuotes: r.hasQuotes,
        hasNewline: r.hasNewline,
      })),
    grouped,
  })
}
