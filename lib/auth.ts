import { NextAuthOptions, getServerSession } from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * 관리자 판별 방식 (3단계):
 *  1) ADMIN_EMAILS 환경변수에 포함된 이메일
 *  2) User.role === 'admin' (DB)
 *  3) 관리자 전용 비밀번호 로그인 (Credentials)
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    }),
    // 관리자 전용 이메일/패스워드 로그인
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase();

        // 1) 환경변수 단순 비교 (빠른 시작용)
        if (
          process.env.ADMIN_BOOT_EMAIL &&
          process.env.ADMIN_BOOT_PASSWORD &&
          email === process.env.ADMIN_BOOT_EMAIL.toLowerCase() &&
          credentials.password === process.env.ADMIN_BOOT_PASSWORD
        ) {
          return {
            id: 'admin-boot',
            email,
            name: 'Admin',
            role: 'admin',
          } as any;
        }

        // 2) DB 기반 관리자 (나중에 비번 해시 저장 후 사용)
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(user as any).hashedPassword) return null;
        const ok = await bcrypt.compare(
          credentials.password,
          (user as any).hashedPassword
        );
        if (!ok) return null;
        if ((user as any).role !== 'admin' && !isAdminEmail(user.email)) {
          return null;
        }
        return {
          id: user.id,
          email: user.email || '',
          name: user.name || 'Admin',
          role: 'admin',
        } as any;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as any).id;
        // role 주입
        if ((user as any).role) {
          token.role = (user as any).role;
        } else if (isAdminEmail(user.email)) {
          token.role = 'admin';
        } else {
          token.role = 'user';
        }
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).provider = token.provider;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return baseUrl + url;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/mypage';
    },
  },
  pages: {
    signIn: '/mypage',
    error: '/mypage',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** 서버 컴포넌트/Route Handler에서 관리자 체크 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const email = session?.user?.email;
  if (role === 'admin' || isAdminEmail(email)) return session;
  return null;
}
