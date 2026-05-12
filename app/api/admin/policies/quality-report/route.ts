import { NextResponse } from 'next/server'
import { buildPolicyQualityAudit } from '@/lib/policy-quality-audit'
import { requireAdmin } from '@/lib/server-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const deny = await requireAdmin()
  if (deny) return deny

  const audit = await buildPolicyQualityAudit()
  return NextResponse.json(audit)
}
