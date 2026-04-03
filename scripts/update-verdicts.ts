import { prisma }           from '../lib/prisma'
import { ThreadsPublisher } from '../lib/threads-publisher'
import { calcVerdict }      from '../lib/rl-engine'

async function main() {
  console.log('=== 성과 수집 + 판정 업데이트 ===')

  const publisher = new ThreadsPublisher()

  // 발행된 포스트 중 threadsId 있는 것 전체
  const posts = await prisma.threadsPost.findMany({
    where: {
      status:    'PUBLISHED',
      threadsId: { not: null },
    },
  })

  let updated = 0
  for (const post of posts) {
    try {
      const insights = await publisher.getInsights(post.threadsId!)
      const verdict  = calcVerdict({
        views:    insights.views,
        likes:    insights.likes,
        comments: insights.replies,
        shares:   insights.reposts,
        format:   post.format as any,
      })

      await prisma.threadsPost.update({
        where: { id: post.id },
        data: {
          views:    insights.views,
          likes:    insights.likes,
          comments: insights.replies,
          shares:   insights.reposts,
          verdict,
        },
      })

      console.log(`[업데이트] ${post.id} → ${verdict} (조회 ${insights.views})`)
      updated++

      // API 호출 제한 방지
      await new Promise(r => setTimeout(r, 500))
    } catch (e) {
      console.error(`[오류] ${post.id}:`, e)
    }
  }

  console.log(`=== 완료: ${updated}개 업데이트 ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
