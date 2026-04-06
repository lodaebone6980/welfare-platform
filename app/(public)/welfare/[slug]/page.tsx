import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  generatePolicyJsonLd,
  generateFaqJsonLd,
  generatePolicyMetaDescription,
  generatePolicyOgData,
  PolicySeoData,
} from '@/lib/seo';

interface Props {
  params: { slug: string };
}

async function getPolicy(slug: string) {
  const policy = await prisma.policy.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { category: true, faqs: true },
  });
  return policy;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = await getPolicy(params.slug);
  if (!policy) return { title: '정책을 찾을 수 없습니다' };
  const seoData: PolicySeoData = {
    title: policy.title,
    description: policy.excerpt || policy.description || '',
    slug: policy.slug,
    category: policy.category?.name || '',
    region: policy.geoRegion || '',
    publishedAt: policy.publishedAt ? policy.publishedAt.toISOString() : policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
  const ogData = generatePolicyOgData(seoData);
  return {
    title: policy.title,
    description: generatePolicyMetaDescription(seoData),
    openGraph: ogData,
    alternates: { canonical: `/welfare/${policy.slug}` },
  };
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  } catch { return String(date); }
}

function getDday(deadline: string | Date | null | undefined): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  try {
  const now = new Date();
  const dl = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (isNaN(dl.getTime())) return null;
  const diff = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: '마감', urgent: true };
  if (diff === 0) return { text: 'D-Day', urgent: true };
  return { text: `D-${diff}`, urgent: diff <= 14 };
  } catch { return null; }
}

export default async function PolicyDetailPage({ params }: Props) {
  const policy = await getPolicy(params.slug);
  if (!policy) notFound();

  const dday = getDday(policy.deadline);

  // View count update (fire-and-forget)
  prisma.policy.update({
    where: { id: policy.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  const relatedPolicies = await prisma.policy.findMany({
    where: {
      categoryId: policy.categoryId,
      id: { not: policy.id },
      status: 'PUBLISHED',
    },
    take: 4,
    orderBy: { viewCount: 'desc' },
    select: {
      id: true, title: true, slug: true,
      geoRegion: true, excerpt: true,
      category: { select: { name: true, slug: true } },
    },
  });

  const seoData: PolicySeoData = {
    title: policy.title,
    description: policy.excerpt || policy.description || '',
    slug: policy.slug,
    category: policy.category?.name || '',
    region: policy.geoRegion || '',
    publishedAt: policy.publishedAt ? policy.publishedAt.toISOString() : policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
  const policyJsonLd = generatePolicyJsonLd(seoData);
  const faqJsonLd = policy.faqs?.length > 0 ? generateFaqJsonLd(policy.faqs.map((f: any) => ({ question: f.question, answer: f.answer }))) : null;

  // Parse content for richer display
  const contentHtml = policy.content || '';
  const hasRichContent = contentHtml.length > 200;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(policyJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <div className="pb-24 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="px-4 pt-4 pb-2 text-xs text-gray-400 flex items-center gap-1 flex-wrap">
          <Link href="/" className="hover:text-blue-600">홈</Link>
          <span>/</span>
          {policy.category && (
            <>
              <Link href={`/welfare/search?category=${policy.category.slug}`} className="hover:text-blue-600">{policy.category.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600">{policy.title}</span>
        </nav>

        {/* Badges */}
        <div className="px-4 flex flex-wrap gap-2 mb-2">
          {policy.category && (
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{policy.category.name}</span>
          )}
          {policy.geoRegion && (
            <span className="px-2.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full">📍 {policy.geoRegion}</span>
          )}
          {dday && (
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${dday.urgent ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{dday.text}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="px-4 text-2xl font-bold text-gray-900 leading-tight">{policy.title}</h1>
        {policy.excerpt && (
          <p className="px-4 mt-1 text-sm text-gray-500">{policy.excerpt}</p>
        )}
        <div className="px-4 mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>등록일: {formatDate(policy.publishedAt || policy.createdAt)}</span>
          <span>조회 {(policy.viewCount || 0) + 1}회</span>
        </div>

        {/* ===== 핵심정보 카드 ===== */}
        <div className="mx-4 mt-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="text-lg">📌</span> 이 정책의 핵심정보
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">카테고리</p>
              <p className="text-sm font-semibold text-gray-800">{policy.category?.name || '-'}</p>
            </div>
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">지역</p>
              <p className="text-sm font-semibold text-gray-800">{policy.geoRegion || '전국'}</p>
            </div>
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">마감일</p>
              <p className={`text-sm font-semibold ${dday?.urgent ? 'text-red-600' : 'text-gray-800'}`}>
                {policy.deadline ? formatDate(policy.deadline) : '상시'}
                {dday && <span className="ml-1 text-xs">({dday.text})</span>}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">지원형태</p>
              <p className="text-sm font-semibold text-gray-800">현금/현물</p>
            </div>
          </div>
        </div>

        {/* ===== 탭 네비게이션 ===== */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 mt-6">
          <div className="px-4 flex">
            <a href="#overview" className="flex-1 text-center py-3 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">사업내용</a>
            <a href="#eligibility" className="flex-1 text-center py-3 text-sm font-medium text-gray-500 hover:text-gray-700">지원대상</a>
            <a href="#howto" className="flex-1 text-center py-3 text-sm font-medium text-gray-500 hover:text-gray-700">신청방법</a>
            <a href="#faq" className="flex-1 text-center py-3 text-sm font-medium text-gray-500 hover:text-gray-700">FAQ</a>
          </div>
        </div>

        {/* ===== 사업내용 섹션 ===== */}
        <section id="overview" className="px-4 pt-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-blue-600 rounded-full inline-block"></span>
            사업내용
          </h2>

          {/* 사업정보 테이블 */}
          <div className="bg-gray-50 rounded-xl overflow-hidden mb-6">
            <div className="divide-y divide-gray-200">
              <div className="flex">
                <div className="w-28 shrink-0 bg-gray-100 px-4 py-3 text-sm text-gray-500 font-medium">지원기관</div>
                <div className="px-4 py-3 text-sm text-gray-800">{policy.geoRegion ? `${policy.geoRegion} 지방자치단체` : '정부'}</div>
              </div>
              <div className="flex">
                <div className="w-28 shrink-0 bg-gray-100 px-4 py-3 text-sm text-gray-500 font-medium">신청 마감일</div>
                <div className={`px-4 py-3 text-sm ${dday?.urgent ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
                  {policy.deadline ? formatDate(policy.deadline) : '상시 모집'}
                </div>
              </div>
              <div className="flex">
                <div className="w-28 shrink-0 bg-gray-100 px-4 py-3 text-sm text-gray-500 font-medium">지원형태</div>
                <div className="px-4 py-3 text-sm text-gray-800">현금 지급</div>
              </div>
              <div className="flex">
                <div className="w-28 shrink-0 bg-gray-100 px-4 py-3 text-sm text-gray-500 font-medium">신청방법</div>
                <div className="px-4 py-3 text-sm text-gray-800">{policy.applicationMethod || '온라인 및 방문 신청'}</div>
              </div>
            </div>
          </div>

          {/* 상세 설명 */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">상세 설명</h3>
            {hasRichContent ? (
              <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: contentHtml }} />
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                {policy.description || policy.excerpt || '상세 설명이 준비 중입니다.'}
              </div>
            )}
          </div>

          {/* CTA 버튼 */}
          <div className="mb-6">
            {policy.applyUrl && (
              <a href={policy.applyUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3.5 rounded-xl font-semibold text-sm transition-colors">
                📋 지금 바로 신청하기
              </a>
            )}
          </div>
        </section>

        {/* ===== 지원대상 섹션 ===== */}
        <section id="eligibility" className="px-4 pt-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-green-500 rounded-full inline-block"></span>
            지원대상
          </h2>
          <div className="bg-green-50 rounded-xl p-5 border border-green-100">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-green-600 font-semibold mb-1">지원대상</p>
                <p className="text-sm text-gray-800 leading-relaxed">{policy.eligibility || '상세 자격 요건은 해당 기관에 문의해주세요.'}</p>
              </div>
              {policy.geoRegion && (
                <div>
                  <p className="text-xs text-green-600 font-semibold mb-1">대상 거주지</p>
                  <p className="text-sm text-gray-800">{policy.geoRegion}{policy.geoDistrict ? ` ${policy.geoDistrict}` : ''} 거주자</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===== 신청방법 섹션 ===== */}
        <section id="howto" className="px-4 pt-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="w-1 h-5 bg-orange-500 rounded-full inline-block"></span>
            신청 방법 및 절차
          </h2>

          {/* 신청 방법 */}
          <div className="bg-orange-50 rounded-xl p-5 border border-orange-100 mb-4">
            <h3 className="text-sm font-bold text-orange-800 mb-2">신청 방법</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{policy.applicationMethod || '온라인 및 방문 신청'}</p>
          </div>

          {/* 필요 서류 */}
          {policy.requiredDocuments && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📄</span> 필요 서류
              </h3>
              <ul className="space-y-2">
                {policy.requiredDocuments.split(',').map((doc: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 mt-0.5">✓</span>
                    <span>{doc.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 신청 절차 가이드 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">신청 절차</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">자격 요건 확인</p>
                  <p className="text-xs text-gray-500 mt-0.5">본인이 지원 대상에 해당하는지 확인합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">필요 서류 준비</p>
                  <p className="text-xs text-gray-500 mt-0.5">위에 안내된 필요 서류를 준비합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">신청서 제출</p>
                  <p className="text-xs text-gray-500 mt-0.5">{policy.applicationMethod ? `${policy.applicationMethod}을(를) 통해 신청서를 제출합니다.` : '온라인 또는 방문으로 신청서를 제출합니다.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <div>
                  <p className="text-sm font-medium text-gray-800">심사 및 지급</p>
                  <p className="text-xs text-gray-500 mt-0.5">신청 후 심사를 거쳐 지원금이 지급됩니다.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ 섹션 ===== */}
        {policy.faqs && policy.faqs.length > 0 && (
          <section id="faq" className="px-4 pt-8">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <span className="w-1 h-5 bg-purple-500 rounded-full inline-block"></span>
              자주 묻는 질문
            </h2>
            <div className="space-y-3">
              {policy.faqs.map((faq: any, idx: number) => (
                <details key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden group">
                  <summary className="px-4 py-3.5 text-sm font-medium text-gray-800 cursor-pointer flex items-center justify-between hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600 font-bold">Q.</span>
                      {faq.question}
                    </span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-4 pb-4 pt-0 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                    <div className="pt-3 flex gap-2">
                      <span className="text-green-600 font-bold shrink-0">A.</span>
                      <span>{faq.answer}</span>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ===== 공유 버튼 ===== */}
        <div className="px-4 pt-8">
          <div className="bg-gray-50 rounded-xl p-5 text-center">
            <p className="text-sm text-gray-600 mb-3">이 정책 정보가 도움이 되셨나요?</p>
            <div className="flex justify-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://welfare-platform-five.vercel.app/welfare/${policy.slug}`)}&text=${encodeURIComponent(policy.title)}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <span>🔗</span> 공유하기
              </a>
              <a
                href={`https://story.kakao.com/share?url=${encodeURIComponent(`https://welfare-platform-five.vercel.app/welfare/${policy.slug}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-yellow-400 rounded-lg text-sm text-gray-900 font-medium hover:bg-yellow-500 flex items-center gap-1.5"
              >
                <span>💬</span> 카카오 공유
              </a>
            </div>
          </div>
        </div>

        {/* ===== 관련 정책 ===== */}
        {relatedPolicies.length > 0 && (
          <section className="px-4 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">관련 정책</h2>
            <div className="space-y-3">
              {relatedPolicies.map((rp: any) => (
                <Link
                  key={rp.id}
                  href={`/welfare/${rp.slug}`}
                  className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {rp.category && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">{rp.category.name}</span>
                        )}
                        {rp.geoRegion && (
                          <span className="text-xs text-gray-400">📍 {rp.geoRegion}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{rp.title}</p>
                      {rp.excerpt && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rp.excerpt}</p>
                      )}
                    </div>
                    <span className="text-gray-300 ml-2 shrink-0">›</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== 하단 고정 CTA ===== */}
        <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 max-w-3xl mx-auto">
          {policy.applyUrl ? (
            <a href={policy.applyUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              신청하기 →
            </a>
          ) : (
            <a href={`https://www.gov.kr/search?srhQuery=${encodeURIComponent(policy.title)}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              신청하기 →
            </a>
          )}
          {policy.externalUrl && (
            <a href={policy.externalUrl} target="_blank" rel="noopener noreferrer"
              className="bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5 shrink-0">
              🔗 복지로
            </a>
          )}
        </div>
      </div>
    </>
  );
}
