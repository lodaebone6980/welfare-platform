import { prisma } from '@/lib/prisma'
import { getPolicyQualityReport } from '@/lib/policy-quality'
import { getPolicySlugFamilyBase } from '@/lib/policy-canonical'

type PolicyForAudit = Awaited<ReturnType<typeof loadPolicies>>[number]

export type PolicyAuditRow = {
  id: number
  title: string
  slug: string
  categoryName: string | null
  updatedAt: string
  viewCount: number
  textLength: number
  completedSections: number
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  sitemapIncluded: boolean
  qualityPass: boolean
  canonicalDerivative: boolean
  duplicateFamily: boolean
  missing: string[]
  reasons: string[]
  publicPath: string
}

export type PolicyQualityAudit = {
  generatedAt: string
  summary: {
    totalPublished: number
    sitemapIncluded: number
    excluded: number
    qualityPass: number
    qualityFail: number
    canonicalDerivative: number
    duplicateFamily: number
    shortText: number
    missingSource: number
    missingEligibility: number
    missingApplicationMethod: number
    missingRequiredDocuments: number
    missingCategory: number
    missingFaq: number
  }
  rows: PolicyAuditRow[]
}

async function loadPolicies() {
  return prisma.policy.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      canonicalId: true,
      content: true,
      excerpt: true,
      description: true,
      eligibility: true,
      applicationMethod: true,
      requiredDocuments: true,
      applyUrl: true,
      externalUrl: true,
      updatedAt: true,
      viewCount: true,
      category: { select: { slug: true, name: true } },
      faqs: { select: { question: true, answer: true } },
    },
    orderBy: { id: 'asc' },
    take: 50000,
  })
}

function plainText(value?: string | null): string {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_>`~\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function meaningful(value?: string | null, minLength = 80): boolean {
  return plainText(value).length >= minLength
}

function scorePolicy(policy: PolicyForAudit, textLength: number, completedSections: number) {
  const sectionScore = Math.round((completedSections / 7) * 70)
  const lengthScore = Math.min(20, Math.round((textLength / 900) * 20))
  const sourceScore = policy.applyUrl || policy.externalUrl ? 10 : 0
  return Math.max(0, Math.min(100, sectionScore + lengthScore + sourceScore))
}

function grade(score: number): PolicyAuditRow['grade'] {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function missingFields(policy: PolicyForAudit): string[] {
  const missing: string[] = []
  if (!(
    meaningful(policy.excerpt, 80) ||
    meaningful(policy.description, 140) ||
    meaningful(policy.content, 260)
  )) {
    missing.push('요약/본문 설명')
  }
  if (!meaningful(policy.eligibility, 80)) missing.push('지원대상')
  if (!meaningful(policy.applicationMethod, 80)) missing.push('신청방법')
  if (!meaningful(policy.requiredDocuments, 40)) missing.push('필요서류')
  if (!policy.applyUrl && !policy.externalUrl) missing.push('공식 출처 URL')
  if (!policy.category?.slug && !policy.category?.name) missing.push('카테고리')
  if ((policy.faqs || []).length < 3) missing.push('FAQ 3개')
  return missing
}

export async function buildPolicyQualityAudit(): Promise<PolicyQualityAudit> {
  const policies = await loadPolicies()
  const usedFamilies = new Set<string>()

  const summary: PolicyQualityAudit['summary'] = {
    totalPublished: policies.length,
    sitemapIncluded: 0,
    excluded: 0,
    qualityPass: 0,
    qualityFail: 0,
    canonicalDerivative: 0,
    duplicateFamily: 0,
    shortText: 0,
    missingSource: 0,
    missingEligibility: 0,
    missingApplicationMethod: 0,
    missingRequiredDocuments: 0,
    missingCategory: 0,
    missingFaq: 0,
  }

  const rows: PolicyAuditRow[] = policies.map((policy) => {
    const quality = getPolicyQualityReport(policy)
    const missing = missingFields(policy)
    const canonicalDerivative = Boolean(policy.canonicalId && policy.canonicalId !== policy.id)
    const familyKey = getPolicySlugFamilyBase(policy.slug)
    const duplicateFamily = !canonicalDerivative && quality.indexable && usedFamilies.has(familyKey)
    let sitemapIncluded = false
    const reasons: string[] = []

    if (canonicalDerivative) reasons.push('canonical 대표 문서가 아님')
    if (!quality.indexable) reasons.push('품질 기준 미달')
    if (duplicateFamily) reasons.push('동일 slug family 중복')

    if (!canonicalDerivative && quality.indexable && !duplicateFamily) {
      sitemapIncluded = true
      usedFamilies.add(familyKey)
    }

    if (quality.indexable) summary.qualityPass += 1
    else summary.qualityFail += 1
    if (canonicalDerivative) summary.canonicalDerivative += 1
    if (duplicateFamily) summary.duplicateFamily += 1
    if (quality.textLength < 900) summary.shortText += 1
    if (missing.includes('공식 출처 URL')) summary.missingSource += 1
    if (missing.includes('지원대상')) summary.missingEligibility += 1
    if (missing.includes('신청방법')) summary.missingApplicationMethod += 1
    if (missing.includes('필요서류')) summary.missingRequiredDocuments += 1
    if (missing.includes('카테고리')) summary.missingCategory += 1
    if (missing.includes('FAQ 3개')) summary.missingFaq += 1
    if (sitemapIncluded) summary.sitemapIncluded += 1

    const score = scorePolicy(policy, quality.textLength, quality.completedSections)

    return {
      id: policy.id,
      title: policy.title,
      slug: policy.slug,
      categoryName: policy.category?.name ?? null,
      updatedAt: policy.updatedAt.toISOString(),
      viewCount: policy.viewCount || 0,
      textLength: quality.textLength,
      completedSections: quality.completedSections,
      score,
      grade: grade(score),
      sitemapIncluded,
      qualityPass: quality.indexable,
      canonicalDerivative,
      duplicateFamily,
      missing,
      reasons,
      publicPath: `/welfare/${encodeURIComponent(policy.slug)}`,
    }
  })

  summary.excluded = summary.totalPublished - summary.sitemapIncluded

  return {
    generatedAt: new Date().toISOString(),
    summary,
    rows: rows.sort((a, b) => {
      if (a.sitemapIncluded !== b.sitemapIncluded) return a.sitemapIncluded ? 1 : -1
      if (a.score !== b.score) return a.score - b.score
      return b.viewCount - a.viewCount
    }),
  }
}
