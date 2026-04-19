import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * /dashboard/* 접근을 관리자만 허용.
 * 비관리자는 /admin/login 으로 리다이렉트.
 *
 * 이 파일을 프로젝트 루트에 middleware.ts 로 저장하세요.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 관리자 전용 경로
  const isAdminRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/content') ||
    pathname.startsWith('/marketing');

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

  const isAdmin = role === 'admin' || adminEmails.includes(email);

  if (!isAdmin) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
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
  ],
};
