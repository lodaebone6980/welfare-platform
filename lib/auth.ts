import { NextAuthOptions } from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
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
