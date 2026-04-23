import type { NextAuthOptions } from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
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
    // scope:
    //   profile_nickname, profile_image, account_email — 기본 프로필/이메일
    //   plusfriends — 카카오톡 채널 추가 상태/메시지 수신 동의
    //     (활성화 조건: 개발자콘솔 > 카카오 로그인 > 동의항목에서 "카카오톡 채널 추가 상태 및 내역"
    //      을 선택 동의로 설정, 그리고 비즈 앱 전환 필요)
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'profile_nickname profile_image account_email plusfriends',
        },
      },
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

    // ── 이메일 링크 로그인 (ENV: EMAIL_SERVER / EMAIL_FROM) ──
    // 설정 안 됐으면 방해 없는 비활성 스플릿 상태로 남음.
    ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
            maxAge: 24 * 60 * 60,
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
    // 차단(BLOCKED)된 유저의 로그인 거부. providers 의 authorize 와 별개로
    // Kakao/Google 등 OAuth 로 가입되어 있는 유저도 여기서 막힌다.
    async signIn({ user }) {
      try {
        const id = (user as any)?.id as string | undefined;
        if (!id) return true; // 최초 가입: DB 에 아직 없음 → 통과
        const db = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        if (db?.role === 'BLOCKED') return false;
      } catch {
        // DB 장애 시 로그인은 허용 (가용성 우선)
      }
      return true;
    },
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
      // 마지막 로그인 시각 갱신 (실패해도 로그인 흐름에 영향 없도록 swallow)
      try {
        const id = (user as any)?.id as string | undefined;
        if (id) {
          await prisma.user.update({
            where: { id },
            data: { lastLoginAt: new Date() as any },
          });
        }
      } catch {
        // ignore
      }
    },
  },
};
