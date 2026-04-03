import { prisma }               from '../lib/prisma'
import { generateThreadsPost }  from '../lib/threads-generator'
import { ThreadsPublisher }     from '../lib/threads-publisher'
import { calcFormatStats, recommendNextFormat, DEFAULT_STATS } from '../lib/rl-engine'
import type { Format } from '../lib/rl-engine'

async function main() {
  console.log('=== Threads 자동 발행 시작 ===')

  // 최근 30개 포스트 성과로 RL 포맷 결정
  const recentPosts = await prisma.threadsPost.findMany({
    where:   { verdict: { not: null } },
    orderBy: { publishedAt: 'desc' },
    take:    30,
  })

  const stats = recentPosts.length >= 5
    ? calcFormatStats(recentPosts.map(p => ({
        views:    p.views,
        likes:    p.likes,
        comments: p.comments,
        shares:   p.shares,
        format:   p.format as Format,
        verdict:  p.verdict as any,
      })))
    : DEFAULT_STATS

  const recommendedFormat = recommendNextFormat(stats)
  console.log(`추천 포맷: ${recommendedFormat}`)

  // 오늘 아직 Threads 발행 안 된 정책 중 하나 선택
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const policy = await prisma.policy.findFirst({
    where: {
      status: 'PUBLISHED',
      threadsPosts: {
        none: { publishedAt: { gte: today } },
      },
    },
    orderBy: { publishedAt: 'desc' },
  })

  if (!policy) {
    console.log('오늘 발행할 정책 없음')
    return
  }

  console.log(`선택 정책: ${policy.title}`)

  // GPT로 Threads 포스트 생성
  const content = await generateThreadsPost(
    {
      title:    policy.title,
      content:  policy.content,
      applyUrl: policy.applyUrl ?? undefined,
    },
    recommendedFormat
  )

  console.log('생성된 포스트:\n', content)

  // Threads API로 발행
  const publisher  = new ThreadsPublisher()
  const threadsId  = await publisher.publish(content)

  if (!threadsId) {
    console.error('Threads 발행 실패')
    process.exit(1)
  }

  // DB 저장
  await prisma.threadsPost.create({
    data: {
      policyId:    policy.id,
      content,
      format:      recommendedFormat,
      threadsId,
      status:      'PUBLISHED',
      publishedAt: new Date(),
    },
  })

  console.log(`=== 완료: ${threadsId} ===`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
