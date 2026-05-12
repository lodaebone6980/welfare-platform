import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateThreadsPost } from '@/lib/threads-generator'
import type { Format } from '@/lib/rl-engine'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FORMATS = new Set(['checklist', 'qa', 'story', 'number', 'compilation', 'cardnews'])

export async function POST(req: NextRequest) {
  const deny = await requireAdmin()
  if (deny) return deny

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'OPENAI_API_KEY is not configured' },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const policyId = Number(body.policyId)
  const format = FORMATS.has(body.format) ? body.format : 'checklist'

  if (!Number.isInteger(policyId)) {
    return NextResponse.json({ ok: false, error: 'policyId is required' }, { status: 400 })
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } })
  if (!policy) return NextResponse.json({ ok: false, error: 'policy not found' }, { status: 404 })

  const content = await generateThreadsPost(
    { title: policy.title, content: policy.content, applyUrl: policy.applyUrl ?? undefined },
    format as Format
  )

  return NextResponse.json({ ok: true, content })
}
