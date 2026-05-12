import { prisma } from '@/lib/prisma';

export interface PolicyLike {
  id: number;
  slug: string;
  canonicalId?: number | null;
  category?: { slug?: string | null } | null;
}

export function getPolicySlugFamilyBase(slug: string): string {
  return slug.replace(/-\d+$/, '');
}

export function getPolicyPath(policy: PolicyLike): string {
  return buildPath(policy.category?.slug ?? null, policy.slug);
}

export async function getCanonicalPath(policy: PolicyLike): Promise<string> {
  if (!policy.canonicalId || policy.canonicalId === policy.id) {
    const duplicateCanonical = await getSlugFamilyCanonical(policy);
    if (duplicateCanonical && duplicateCanonical.id !== policy.id) {
      return getPolicyPath(duplicateCanonical);
    }
    return getPolicyPath(policy);
  }

  try {
    const original = await prisma.policy.findUnique({
      where: { id: policy.canonicalId },
      select: {
        slug: true,
        status: true,
        category: { select: { slug: true } },
      },
    });

    if (!original || original.status !== 'PUBLISHED') {
      return getPolicyPath(policy);
    }

    return buildPath(original.category?.slug ?? null, original.slug);
  } catch {
    return getPolicyPath(policy);
  }
}

async function getSlugFamilyCanonical(policy: PolicyLike): Promise<PolicyLike | null> {
  const base = getPolicySlugFamilyBase(policy.slug);
  if (base === policy.slug) return policy;

  try {
    const original = await prisma.policy.findFirst({
      where: {
        status: 'PUBLISHED',
        slug: { startsWith: `${base}-` },
      },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        slug: true,
        canonicalId: true,
        category: { select: { slug: true } },
      },
    });

    return original || policy;
  } catch {
    return policy;
  }
}

function buildPath(categorySlug: string | null, policySlug: string): string {
  return `/welfare/${encodeURIComponent(policySlug)}`;
}

export function isDerivative(policy: PolicyLike): boolean {
  return !!policy.canonicalId && policy.canonicalId !== policy.id;
}
