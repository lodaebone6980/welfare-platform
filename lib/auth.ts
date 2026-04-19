import type { NextAuthOptions } from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    // ── 일반 유저: 카카오 ──────────────────────────────
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    }),

    // ── 일반 유저: 구글 (ENV: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) ──
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: { prompt: 'consent', access_type: 'offline', response_type: 'code' },
            },
          }),
        ]
      : []),

    // ── 관리자 전용: ID + 비밀번호 ─────────────────────
    // 공개 /login 에는 노출 X. /access/admin 에서만 signIn('admin-credentials', ...)
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin',
      credentials: {
        email: { label: 'ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = credentials.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email: identifier },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            passwordHash: true,
          },
        });

        // 없거나, 비번 미설정이거나, ADMIN 아니면 거부 — 메시지 동일화
        if (!user || !user.passwordHash || user.role !== 'ADMIN') {
          // timing attack 완화용 더미 비교
          await bcrypt.compare(
            credentials.password,
            '$2a$12$CwTycUXWue0Thq9StjUM0uJ8GAFWOe4vxGM3W8nq3y7KHEF1qXXvK',
          );
          return null;
        }

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // 최초 로그인: DB 에서 role 재확정
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: (user as any).id },
          select: { role: true },
        });
        (token as any).userId = (user as any).id;
        (token as any).role = dbUser?.role ?? 'USER';
      }
      if (account) {
        (token as any).accessToken = account.access_token;
        (token as any).provider = account.provider;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).userId;
        (session.user as any).role = (token as any).role;
        (session.user as any).accessToken = (token as any).accessToken;
        (session.user as any).provider = (token as any).provider;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return baseUrl + url;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/mypage';
    },
  },

  events: {
    async signIn({ user, account }) {
      if (account?.provider === 'admin-credentials') {
        console.log(`[ADMIN SIGNIN] ${user.email} @ ${new Date().toISOString()}`);
      }
    },
  },
};
