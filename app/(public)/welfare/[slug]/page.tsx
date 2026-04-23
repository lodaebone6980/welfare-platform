import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { isValidCategorySlug } from '@/lib/categories';
import { SITE_NAME, SITE_URL } from '@/lib/env';
import {
  generatePolicyJsonLd,
  generateFaqJsonLd,
  generateBreadcrumbJsonLd,
  generatePolicyMetaDescription,
  generatePolicyOgData,
  PolicySeoData,
} from '@/lib/seo';
import { normalizePolicyHtml } from '@/lib/markdown-safe';
import {
  cleanTitle as cleanPolicyTitle,
  getDday as getDdayShared,
  extractBenefitSummary,
} from '@/lib/policy-display';
import { getPolicyBySlug, getRelatedPolicies } from '@/lib/policy-detail';

/**
 * 레거시 URL: /welfare/:slug
 * ---------------------------------------------------------------
 * Google/Naver 가 과거에 색인한 URL 이라 살려둠.
 *
 * [성능 최적화 — 2026-04 변경]
 *   - 기존: 카테고리가 있으면 /:category/:slug 로 301 리다이렉트
 *           → 검색 클릭 1회 = 2번의 SSR + 2번의 DB 조회 + 추가 RTT
 *   - 변경: 그 자리에서 직접 렌더 + <link rel="canonical"> 으로 새 URL 가리킴
 *           → 검색 엔진은 canonical 을 따라 점진적으로 새 URL 로 이전
 *           → 사용자는 redirect 없이 즉시 페이지 확인
 *
 *   - getPolicyBySlug: React.cache() 로 generateMetadata + page render dedupe
 *   - revalidate=300: 5분 ISR (정책 데이터 변경 빈도 낮음)
 */

// ISR: 5분마다 재검증
export const revalidate = 300;

interface Props {
  params: { slug: string };
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch (e) {
    return String(date);
  }
}

function getDday(
  deadline: string | Date | null | undefined
): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  try {
    const now = new Date();
    const dl = typeof deadline === 'string' ? new Date(deadline) : deadline;
    if (isNaN(dl.getTime())) return null;
    const diff = Math.ceil(
      (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return { text: '마감', urgent: true };
    if (diff === 0) return { text: 'D-Day', urgent: true };
    return { text: `D-${diff}`, urgent: diff <= 14 };
  } catch (e) {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await getPolicyBySlug(params.slug);
  if (!policy) {
    return { title: '정책을 찾을 수 없습니다' };
  }
  const seoData: PolicySeoData = {
    title: policy.title,
    slug: policy.slug,
    description: policy.excerpt || policy.content?.substring(0, 160) || '',
    category: policy.category?.name || '',
    geoRegion: policy.geoRegion || '',
    deadline: policy.deadline || undefined,
    applicationMethod: policy.applicationMethod || undefined,
  };
  const ogData = generatePolicyOgData(seoData);

  // canonical: 카테고리가 있으면 새 URL, 없으면 현재 URL
  const catSlug = policy.category?.slug;
  const canonicalPath =
    catSlug && isValidCategorySlug(catSlug)
      ? `/${catSlug}/${encodeURIComponent(policy.slug)}`
      : `/welfare/${encodeURIComponent(policy.slug)}`;

  return {
    title: `${policy.title} | ${SITE_NAME}`,
    description: generatePolicyMetaDescription(seoData),
    openGraph: { title: ogData.title, description: ogData.description, type: 'article' },
    alternates: { canonical: `${SITE_URL}${canonicalPath}` },
  };
}

export default async function PolicyDetailPage({ params }: Props) {
  // cache() 로 generateMetadata 와 동일 SQL 1회 공유
  const policy = await getPolicyBySlug(params.slug);
  if (!policy) notFound();

  // [성능] 과거에는 카테고리가 있으면 /:category/:slug 로 301 리다이렉트했으나,
  // 검색 클릭 시 RTT 1회 추가 + DB 조회 2회를 유발하므로 제거.
  // <link rel="canonical"> 메타 태그로 검색엔진에게 새 URL 을 알리고
  // 사용자에게는 즉시 페이지를 보여줌.

  const dday = getDdayShared(policy.deadline);

  // fire-and-forget: 서버 렌더를 막지 않도록 await 제거
  prisma.policy
    .update({
      where: { id: policy.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  const benefit = extractBenefitSummary({
    title: policy.title,
    excerpt: policy.excerpt,
    content: policy.content,
    description: policy.description,
    eligibility: policy.eligibility,
    deadline: policy.deadline,
    applicationMethod: policy.applicationMethod,
  });
  const displayTitle = cleanPolicyTitle(policy.title);

  const relatedPolicies = await getRelatedPolicies({
    categoryId: policy.categoryId,
    excludeId: policy.id,
    take: 4,
  });

  const seoData: PolicySeoData = {
    title: policy.title,
    slug: policy.slug,
    description: policy.content?.substring(0, 160) || '',
    excerpt: policy.excerpt || '',
    category: policy.category?.name || '',
    categorySlug: policy.category?.slug || '',
    geoRegion: policy.geoRegion || '',
    eligibility: policy.eligibility || '',
    applicationMethod: policy.applicationMethod || '',
    requiredDocuments: policy.requiredDocuments || '',
    applyUrl: policy.applyUrl || '',
    publishedAt: policy.publishedAt || undefined,
    updatedAt: policy.updatedAt || undefined,
    deadline: policy.deadline || undefined,
  };
  const jsonLd = generatePolicyJsonLd(seoData);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(seoData);
  const faqJsonLd = generateFaqJsonLd(seoData);

  const catName = policy.category?.name || '';
  const categoryColor: Record<string, string> = {
    '환급금': 'bg-green-100 text-green-800',
    '바우처': 'bg-purple-100 text-purple-800',
    '지원금': 'bg-red-100 text-red-800',
    '대출': 'bg-blue-100 text-blue-800',
    '보조금': 'bg-yellow-100 text-yellow-800',
    '교육': 'bg-indigo-100 text-indigo-800',
    '주거': 'bg-orange-100 text-orange-800',
    '취업': 'bg-teal-100 text-teal-800',
    '건강': 'bg-pink-100 text-pink-800',
    '문화': 'bg-cyan-100 text-cyan-800',
    '고용': 'bg-amber-100 text-amber-800',
  };
  const catBadgeClass = categoryColor[catName] || 'bg-gray-100 text-gray-800';

  return (
    <>
      {/* JSON-LD: SEO(GovernmentService) + GEO(BreadcrumbList) + AEO(FAQPage) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <div className="max-w-3xl mx-auto px-4 pb-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Link href="/" className="hover:text-blue-600">홈</Link>
          <span>/</span>
          {policy.category && (
            <>
              <Link href={`/welfare/search?category=${policy.category.slug}`} className="hover:text-blue-600">{policy.category.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900 truncate">{policy.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${catBadgeClass}`}>{(catName || '기타').replace(/·/g, ' ')}</span>
            {policy.geoRegion && <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{policy.geoRegion}</span>}
            {dday && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  dday.always
                    ? 'bg-emerald-100 text-emerald-700'
                    : dday.urgent
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {dday.always ? '🔁 상시신청' : dday.text}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{displayTitle}</h1>
          {policy.excerpt && <p className="text-gray-600 leading-relaxed">{policy.excerpt}</p>}
        </div>

        {/* 혜택 한눈에 */}
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          <p className="text-[11px] font-semibold text-blue-700 tracking-wide mb-3">혜택 한눈에</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-1">💰 지원금액</p>
              <p className="text-sm font-bold text-gray-900 leading-snug">
                {benefit.amount || '본문 참고'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-1">👥 지원대상</p>
              <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">
                {benefit.target || (policy.geoRegion ? `${policy.geoRegion} 거주자` : '본문 참고')}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-1">📅 신청기간</p>
              <p className="text-sm font-medium text-gray-800 leading-snug">
                {policy.deadline && !/상시|수시|연중/.test(policy.deadline)
                  ? policy.deadline
                  : '상시 접수'}
              </p>
            </div>
          </div>
        </div>

        {/* Key Info Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">카테고리</p>
            <p className="font-semibold text-sm text-blue-700">{catName || '-'}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">지역</p>
            <p className="font-semibold text-sm text-green-700">{policy.geoRegion || '전국'}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">마감일</p>
            <p className="font-semibold text-sm text-orange-700">{policy.deadline ? formatDate(policy.deadline) : '상시'}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">지원형태</p>
            <p className="font-semibold text-sm text-purple-700">{catName || '지원금'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-0 z-10 bg-white border-b mb-6">
          <div className="flex">
            <a href="#content" className="flex-1 py-3 text-center text-sm font-medium text-blue-600 border-b-2 border-blue-600">사업내용</a>
            <a href="#eligibility" className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-blue-600">지원대상</a>
            <a href="#howto" className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-blue-600">신청방법</a>
            {policy.faqs && policy.faqs.length > 0 && <a href="#faq" className="flex-1 py-3 text-center text-sm font-medium text-gray-500 hover:text-blue-600">FAQ</a>}
          </div>
        </div>

        {/* Business Info Table */}
        <section id="content" className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-600 rounded-full inline-block"></span>
            사업 정보
          </h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-28">지원기관</td><td className="px-4 py-3">{policy.geoRegion || '-'}</td></tr>
                <tr className="border-b"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">마감일</td><td className="px-4 py-3">{policy.deadline ? formatDate(policy.deadline) : '상시접수'}</td></tr>
                <tr className="border-b"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">지원형태</td><td className="px-4 py-3">{catName || '-'}</td></tr>
                <tr><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">신청방법</td><td className="px-4 py-3">{policy.applicationMethod || '온라인/방문 신청'}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Content Section */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-600 rounded-full inline-block"></span>
            상세 설명
          </h2>
          <div className="bg-white rounded-xl border p-5">
            {policy.content ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: normalizePolicyHtml(policy.content) }} />
            ) : policy.description ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: normalizePolicyHtml(policy.description) }} />
            ) : (
              <p className="text-gray-500">상세 설명이 없습니다.</p>
            )}
          </div>
        </section>

        {/* CTA */}
        {policy.applyUrl && (
          <div className="mb-8 text-center">
            <Link href={policy.applyUrl} rel="nofollow" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg">
              신청하기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </Link>
          </div>
        )}

        {/* Eligibility */}
        <section id="eligibility" className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full inline-block"></span>
            지원 대상
          </h2>
          <div className="bg-green-50 rounded-xl border border-green-100 p-5">
            {policy.eligibility ? (
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: normalizePolicyHtml(policy.eligibility) }} />
            ) : (
              <p className="text-gray-500">지원 대상 정보가 없습니다. 상세 페이지에서 확인해주세요.</p>
            )}
          </div>
        </section>

        {/* How to Apply */}
        <section id="howto" className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-orange-600 rounded-full inline-block"></span>
            신청 방법
          </h2>
          <div className="bg-white rounded-xl border p-5">
            {policy.applicationMethod ? (
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: normalizePolicyHtml(policy.applicationMethod) }} />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3"><div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">1</div><div><p className="font-medium">자격 확인</p><p className="text-sm text-gray-500">지원 대상 여부를 확인합니다</p></div></div>
                <div className="flex gap-3"><div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">2</div><div><p className="font-medium">서류 준비</p><p className="text-sm text-gray-500">필요한 서류를 준비합니다</p></div></div>
                <div className="flex gap-3"><div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">3</div><div><p className="font-medium">신청서 작성</p><p className="text-sm text-gray-500">온라인 또는 방문으로 신청합니다</p></div></div>
                <div className="flex gap-3"><div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">4</div><div><p className="font-medium">결과 확인</p><p className="text-sm text-gray-500">심사 후 결과를 확인합니다</p></div></div>
              </div>
            )}
          </div>
        </section>

        {/* Required Documents */}
        {policy.requiredDocuments && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-600 rounded-full inline-block"></span>
              필요 서류
            </h2>
            <div className="bg-purple-50 rounded-xl border border-purple-100 p-5">
              <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: normalizePolicyHtml(policy.requiredDocuments) }} />
            </div>
          </section>
        )}

        {/* FAQ */}
        {policy.faqs && policy.faqs.length > 0 && (
          <section id="faq" className="mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-yellow-500 rounded-full inline-block"></span>
              자주 묻는 질문
            </h2>
            <div className="space-y-3">
              {policy.faqs.map((faq: any, idx: number) => (
                <details key={faq.id || idx} className="bg-white rounded-xl border group">
                  <summary className="px-5 py-4 cursor-pointer font-medium text-gray-900 flex justify-between items-center">
                    <span>Q. {faq.question}</span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t pt-3">{faq.answer}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Related Policies */}
        {relatedPolicies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">관련 정책</h2>
            <div className="space-y-3">
              {relatedPolicies.map((rp) => {
                const relHref =
                  rp.category?.slug && isValidCategorySlug(rp.category.slug)
                    ? `/${rp.category.slug}/${encodeURIComponent(rp.slug)}`
                    : `/welfare/${encodeURIComponent(rp.slug)}`;
                return (
                  <Link key={rp.id} href={relHref} className="block bg-white rounded-xl border p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2 mb-1">
                      {rp.category?.name && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{rp.category.name}</span>}
                      {rp.geoRegion && <span className="text-xs text-gray-400">{rp.geoRegion}</span>}
                    </div>
                    <p className="font-medium text-gray-900">{rp.title}</p>
                    {rp.excerpt && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{rp.excerpt}</p>}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg px-4 py-3 z-20">
          <div className="max-w-3xl mx-auto flex gap-3">
            {policy.applyUrl ? (
              <Link href={policy.applyUrl} rel="nofollow" className="flex-1 bg-blue-600 text-white text-center py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                신청하기
              </Link>
            ) : (
              <Link href="https://www.bokjiro.go.kr" rel="nofollow" className="flex-1 bg-blue-600 text-white text-center py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                복지로 바로가기
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
