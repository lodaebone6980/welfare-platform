import { PrismaClient } from '@prisma/client'

/**
 * ⚠️ 서버리스(Vercel) 에서 콜드스타트마다 Prisma Client 가 새로 만들어지면
 *   - 연결 확립 200~500ms 지연
 *   - 동시 호출이 많으면 Supabase 연결 한도 초과
 * 방지를 위해 Supabase **Transaction Pooler (포트 6543)** 주소를
 * DATABASE_URL 에 사용하고 `?pgbouncer=true&connection_limit=1` 을 붙여주세요.
 *
 * 예:
 *   postgresql://postgres.xxxxxx:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
 *
 * (마이그레이션을 돌릴 때는 pgbouncer 가 prepared statement 를 지원하지 않아
 *  직결 URL 이 필요합니다. `DIRECT_URL` 환경변수를 추가로 세팅하고
 *  schema.prisma 의 `datasource.directUrl` 로 참조하세요.)
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// 개발 환경 + 서버리스(Vercel) 에서 모두 globalForPrisma 캐시를 사용해
// 동일 워커 내 재호출 시 Client 재사용 → 콜드스타트 감소
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL === '1') {
  globalForPrisma.prisma = prisma
}
