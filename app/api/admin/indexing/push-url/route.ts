import { NextResponse } from 'next/server'
import { pushUrl } from '@/lib/indexing/push'
import { SITE_ORIGIN } from '@/lib/indexing/types'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const deny = await requireAdmin()
  if (deny) return deny

  const body = await req.json().catch(() => ({})) as {
    url?: string
    trigger?: 'MANUAL_URL' | 'PUBLISH_HOOK'
  }
  const raw = body.url?.trim()

  if (!raw) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let url = raw
  if (url.startsWith('/')) url = `${SITE_ORIGIN}${url}`
  if (!url.startsWith(SITE_ORIGIN)) {
    return NextResponse.json(
      { error: `url must start with ${SITE_ORIGIN}` },
      { status: 400 }
    )
  }

  try {
    const result = await pushUrl(url, body.trigger ?? 'MANUAL_URL')
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
