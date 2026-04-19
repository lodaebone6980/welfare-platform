import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// /admin 으로 시작하는 모든 경로에 대해 role === 'ADMIN' 필요.
// 미로그인 or role !== ADMIN → /access/admin 으로 리다이렉트.

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth.token as any)?.role;

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      const url = req.nextUrl.clone();
      url.pathname = '/access/admin';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // token 이 아예 없어도 middleware 는 실행되도록 (위 함수에서 직접 리다이렉트)
      authorized: () => true,
    },
  },
);

export const config = {
  matcher: ['/admin/:path*'],
};
