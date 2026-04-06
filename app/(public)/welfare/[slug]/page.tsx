import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { slug: string };
}

export default async function PolicyDetailPage({ params }: Props) {
  const slug = params.slug;
  
  let policy = null;
  let error = null;
  let count = 0;
  
  try {
    // First try exact match
    policy = await prisma.policy.findFirst({
      where: { slug: slug },
    });
    
    // Count total policies
    count = await prisma.policy.count();
  } catch (e: any) {
    error = e?.message || String(e);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      <div className="bg-yellow-50 p-4 rounded mb-4">
        <p><strong>Received slug:</strong> {slug}</p>
        <p><strong>Slug length:</strong> {slug.length}</p>
        <p><strong>Slug encoded:</strong> {encodeURIComponent(slug)}</p>
        <p><strong>Total policies in DB:</strong> {count}</p>
      </div>
      {error && (
        <div className="bg-red-50 p-4 rounded mb-4">
          <p className="text-red-700"><strong>Error:</strong> {error}</p>
        </div>
      )}
      {policy ? (
        <div className="bg-green-50 p-4 rounded mb-4">
          <p className="text-green-700"><strong>Policy found!</strong></p>
          <p>ID: {policy.id}</p>
          <p>Title: {policy.title}</p>
          <p>Slug: {policy.slug}</p>
          <p>Status: {policy.status}</p>
        </div>
      ) : (
        <div className="bg-red-50 p-4 rounded mb-4">
          <p className="text-red-700"><strong>No policy found with this slug</strong></p>
        </div>
      )}
      <Link href="/" className="text-blue-600 hover:underline">Back to Home</Link>
    </div>
  );
}
