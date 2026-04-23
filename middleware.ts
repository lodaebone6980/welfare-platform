import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * /dashboard/* 접근을 관리자만 허용.
 * 비관리자는 /admin/login 으로 리다이렉트.
 *
 * 이 파일을 프로젝트 루트에 middleware.ts 로 저장하세요.
 */
// 관리자 전용 경로 프리픽스 (matcher 와 동기화 유지)
const ADMIN_ROUTE_PREFIXES = [
  '/dashboard',
  '/content',
  '/marketing',
  '/popularity',
  '/members',
  '/settings',
  '/search-trending',
  '/trending',
  '/trending-news',
  '/traffic',
  '/api-status',
  '/diagnostics',
  '/admin',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 어드민 로그인 페이지 자체는 인증 없이 통과
  if (
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/access/admin')
  ) {
    return NextResponse.next();
  }

  const isAdminRoute = ADMIN_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isAdminRoute) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const role = (token as any)?.role;
  const email = (token?.email || '').toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = role === 'ADMIN' || role === 'admin' || adminEmails.includes(email);

  if (!isAdmin) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/access/admin';
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/content/:path*',
    '/marketing/:path*',
    '/popularity/:path*',
    '/members/:path*',
    '/settings/:path*',
    '/search-trending/:path*',
    '/trending/:path*',
    '/trending-news/:path*',
    '/traffic/:path*',
    '/api-status/:path*',
    '/diagnostics/:path*',
    '/admin/:path*',
  ],
};
