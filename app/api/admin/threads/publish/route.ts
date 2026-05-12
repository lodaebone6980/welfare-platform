import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateThreadsPost } from '@/lib/threads-generator'
import { ThreadsPublisher } from '@/lib/threads-publisher'
import type { Format } from '@/lib/rl-engine'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FORMATS = new Set(['checklist', 'qa', 'story', 'number', 'compilation', 'cardnews'])

export async function POST(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  const body = await req.json().catch(() => ({}))
  const policyId = Number(body.policyId)
  const format = FORMATS.has(body.format) ? body.format : 'checklist'

  if (!Number.isInteger(policyId)) {
    return NextResponse.json({ ok: false, error: 'policyId is required' }, { status: 400 })
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } })
  if (!policy) return NextResponse.json({ ok: false, error: 'policy not found' }, { status: 404 })

  const content = body.content || (
    process.env.OPENAI_API_KEY
      ? await generateThreadsPost(
          { title: policy.title, content: policy.content, applyUrl: policy.applyUrl ?? undefined },
          format as Format
        )
      : ''
  )

  if (!content) {
    return NextResponse.json({ ok: false, error: 'content is required' }, { status: 400 })
  }

  const configured = Boolean(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN)

  if (!configured) {
    const post = await prisma.threadsPost.create({
      data: {
        policyId,
        content,
        format,
        status: 'draft',
      },
    })
    return NextResponse.json({
      ok: true,
      configured: false,
      message: 'THREADS_USER_ID and THREADS_ACCESS_TOKEN are not configured. Saved as draft.',
      post,
    }, { status: 201 })
  }

  const publisher = new ThreadsPublisher()
  const threadsId = await publisher.publish(content)

  if (!threadsId) {
    return NextResponse.json({ ok: false, error: 'threads publish failed' }, { status: 502 })
  }

  const post = await prisma.threadsPost.create({
    data: {
      policyId,
      content,
      format,
      threadsId,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true, configured: true, post }, { status: 201 })
}
