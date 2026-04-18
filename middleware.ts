import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * 어드민 라우트 가드.
 * - (admin) route group 의 실제 URL: /dashboard, /content, /traffic, /api-status, /trending, /marketing
 * - /api/admin/* 도 보호
 * - NextAuth JWT 토큰 세션 검사
 * - 토큰 없으면 /mypage (로그인) 로 리다이렉트 (콜백 URL 유지)
 *
 * 추후 role 기반 권한이 필요하면 token.role 을 확인해서 403 처리.
 */

const ADMIN_PAGE_PREFIXES = [
  '/dashboard',
  '/content',
  '/traffic',
  '/api-status',
  '/trending',
  '/marketing',
]

const ADMIN_API_PREFIXES = ['/api/admin']

function isProtectedPath(pathname: string): { page: boolean; api: boolean } {
  const page = ADMIN_PAGE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  const api = ADMIN_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  return { page, api }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const { page, api } = isProtectedPath(pathname)
  if (!page && !api) return NextResponse.next()

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // 토큰 존재 시 통과. 추후 role gating 여기에 추가.
  if (token) return NextResponse.next()

  if (api) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  // 페이지는 로그인으로 보내고 콜백 URL 보존
  const loginUrl = new URL('/mypage', req.url)
  loginUrl.searchParams.set('callbackUrl', pathname + (search || ''))
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/content/:path*',
    '/traffic/:path*',
    '/api-status/:path*',
    '/trending/:path*',
    '/marketing/:path*',
    '/api/admin/:path*',
  ],
}
