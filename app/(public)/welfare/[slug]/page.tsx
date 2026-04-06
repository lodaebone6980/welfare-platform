import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { slug: string };
}

async function getPolicy(slug: string) {
  try {
    const policy = await prisma.policy.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { category: true, faqs: true },
    });
    return policy;
  } catch (err) {
    console.error('getPolicy error:', err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await getPolicy(params.slug);
  if (!policy) return { title: 'Policy Not Found' };
  return {
    title: policy.title,
    description: policy.excerpt || policy.title,
  };
}

export default async function PolicyDetailPage({ params }: Props) {
  const policy = await getPolicy(params.slug);
  if (!policy) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{policy.title}</h1>
      <p className="text-gray-600 mb-2">Slug: {params.slug}</p>
      <p className="text-gray-600 mb-2">Category: {policy.category?.name || 'N/A'}</p>
      <p className="text-gray-600 mb-2">Region: {policy.geoRegion || 'N/A'}</p>
      <p className="text-gray-600 mb-2">Status: {policy.status}</p>
      <p className="text-gray-600 mb-2">FAQs count: {policy.faqs?.length || 0}</p>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="font-semibold">Content preview:</p>
        <p>{policy.content?.substring(0, 200) || 'No content'}</p>
      </div>
      <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
        Back to Home
      </Link>
    </div>
  );
}
