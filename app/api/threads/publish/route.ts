import { NextRequest, NextResponse } from 'next/server'
import { prisma }               from '@/lib/prisma'
import { generateThreadsPost }  from '@/lib/threads-generator'
import { ThreadsPublisher }     from '@/lib/threads-publisher'
import type { Format }          from '@/lib/rl-engine'

export async function POST(req: NextRequest) {
  const { policyId, format, content: customContent } = await req.json()

  const policy = await prisma.policy.findUnique({ where: { id: policyId } })
  if (!policy) return NextResponse.json({ error: 'policy not found' }, { status: 404 })

  // 사용자가 직접 작성한 내용 or AI 자동 생성
  const content = customContent ?? await generateThreadsPost(
    { title: policy.title, content: policy.content, applyUrl: policy.applyUrl ?? undefined },
    format as Format
  )

  const publisher = new ThreadsPublisher()
  const threadsId = await publisher.publish(content)

  if (!threadsId) {
    return NextResponse.json({ error: 'threads publish failed' }, { status: 500 })
  }

  const post = await prisma.threadsPost.create({
    data: {
      policyId,
      content,
      format,
      threadsId,
      status:      'PUBLISHED',
      publishedAt: new Date(),
    },
  })

  return NextResponse.json(post, { status: 201 })
}
