import { notFound }      from 'next/navigation'
import { Metadata }       from 'next'
import { prisma }         from '@/lib/prisma'
import { buildMetaTags }  from '@/lib/seo'

interface Props { params: { slug: string } }

async function getPolicy(slug: string) {
  return prisma.policy.findUnique({
    where:   { slug, status: 'PUBLISHED' },
    include: { category: true, faqs: { orderBy: { order: 'asc' } } },
  })
}

export async function generateStaticParams() {
  try {
    const policies = await prisma.policy.findMany({
      where:  { status: 'PUBLISHED' },
      select: { slug: true },
    })
    return policies.map(p => ({ slug: p.slug }))
  } catch (e) {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await getPolicy(params.slug)
  if (!policy) return { title: '페이지를 찾을 수 없습니다' }

  const meta = buildMetaTags({
    title:        policy.title,
    excerpt:      policy.excerpt ?? '',
    slug:         policy.slug,
    focusKeyword: policy.focusKeyword ?? '',
    geoRegion:    policy.geoRegion ?? undefined,
    faqs:         policy.faqs.map(f => ({ q: f.question, a: f.answer })),
    publishedAt:  policy.publishedAt?.toISOString(),
  })

  return {
    title:       meta.title,
    description: meta.description,
    alternates:  { canonical: meta.canonical },
    openGraph:   meta.openGraph as any,
    other:       meta.other,
  }
}

export const revalidate = 3600 // 1시간 ISR

export default async function PolicyPage({ params }: Props) {
  const policy = await getPolicy(params.slug)
  if (!policy) notFound()

  const meta = buildMetaTags({
    title:        policy.title,
    excerpt:      policy.excerpt ?? '',
    slug:         policy.slug,
    focusKeyword: policy.focusKeyword ?? '',
    geoRegion:    policy.geoRegion ?? undefined,
    faqs:         policy.faqs.map(f => ({ q: f.question, a: f.answer })),
  })

  // 조회수 증가 (fire-and-forget)
  prisma.policy.update({
    where: { id: policy.id },
    data:  { viewCount: { increment: 1 } },
  }).catch(() => {})

  return (
    <>
      {/* JSON-LD 구조화 데이터 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(meta.jsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* 카테고리 배지 */}
        {policy.category && (
          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full mb-3">
            {policy.category.name}
          </span>
        )}

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
          {policy.title}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {policy.publishedAt?.toLocaleDateString('ko-KR')}
        </p>

        {/* AdSense 상단 슬롯 */}
        <div className="my-5 text-center">
          <ins className="adsbygoogle block"
            data-ad-client={process.env.ADSENSE_PUB_ID}
            data-ad-slot="1111111111"
            data-ad-format="auto"
            data-full-width-responsive="true" />
        </div>

        {/* 히어로 신청 버튼 */}
        {policy.applyUrl && (
          <div className="bg-blue-50 rounded-xl p-5 mb-6 text-center">
            <div className="text-sm text-blue-700 mb-3">신청 기간 내 빠르게 신청하세요</div>
            <a
              href={policy.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium
                hover:bg-blue-700 transition-colors no-underline"
            >
              지금 신청하기 →
            </a>
          </div>
        )}

        {/* 본문 */}
        <div
          className="prose prose-sm max-w-none prose-headings:text-gray-800
            prose-a:text-blue-600 prose-strong:text-gray-800
            [&_.cta-button]:bg-blue-600 [&_.cta-button]:text-white
            [&_.cta-button]:px-6 [&_.cta-button]:py-3 [&_.cta-button]:rounded-lg
            [&_.cta-button]:inline-block [&_.cta-button]:no-underline [&_.cta-button]:font-medium
            [&_.faq-block_details]:border [&_.faq-block_details]:rounded
            [&_.faq-block_details]:p-3 [&_.faq-block_details]:mb-2"
          dangerouslySetInnerHTML={{ __html: policy.content }}
        />

        {/* AdSense 하단 슬롯 */}
        <div className="my-6 text-center">
          <ins className="adsbygoogle block"
            data-ad-client={process.env.ADSENSE_PUB_ID}
            data-ad-slot="3333333333"
            data-ad-format="auto"
            data-full-width-responsive="true" />
        </div>

        {/* FAQ 스키마 블록 */}
        {policy.faqs.length > 0 && (
          <section className="mt-8" itemScope itemType="https://schema.org/FAQPage">
            <h2 className="text-lg font-bold text-gray-800 mb-4">자주 묻는 질문</h2>
            <div className="space-y-3">
              {policy.faqs.map(faq => (
                <div key={faq.id}
                  itemScope itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="font-medium text-gray-800 mb-2" itemProp="name">
                    Q. {faq.question}
                  </div>
                  <div
                    itemScope itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <div className="text-gray-600 text-sm" itemProp="text">
                      A. {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}
