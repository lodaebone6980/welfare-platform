import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SITE_NAME } from '@/lib/env';
import PolicyCard from '@/components/home/PolicyCard';
import CategoryIcon from '@/components/ui/CategoryIcon';

export const revalidate = 300;

interface Props {
  params: { slug: string };
}

/**
 * 빌드 시점에 모든 카테고리 slug 를 정적으로 생성.
 * → 첫 방문에도 프리렌더된 HTML 이 즉시 응답됨 (TTFB ↓)
 */
export async function generateStaticParams() {
  const cats = await prisma.category.findMany({ select: { slug: true } });
  return cats.map((c) => ({ slug: c.slug }));
}

/**
 * 카테고리별 상세 리스트 페이지 (/welfare/categories/{slug})
 *
 * 기존: 홈에서 카테고리 아이콘 클릭 → 이 경로로 이동하지만 파일이 없어서 404
 * 수정: 카테고리별 고유 SEO 메타 + 해당 카테고리의 모든 정책 리스트
 */

// 카테고리별 고유 SEO 설명 — 구글·네이버 색인에 차별화된 의도로 노출되게
const CATEGORY_META: Record<string, { subtitle: string; desc: string }> = {
  '생활안정': {
    subtitle: '생계비·긴급복지·기초생활보장',
    desc: '저소득층·위기가구를 위한 생계비·긴급복지·기초생활보장 등 생활안정 지원 제도 모음.',
  },
  '주거·자립': {
    subtitle: '전·월세·임대주택·자립지원',
    desc: '청년·신혼부부·저소득층 대상 전세자금·월세지원·공공임대·자립지원 제도 모음.',
  },
  '보육·교육': {
    subtitle: '어린이집·유아·초중고·대학생',
    desc: '보육료·유아학비·장학금·교육비·돌봄서비스 등 보육과 교육 관련 지원 제도 모음.',
  },
  '고용·창업': {
    subtitle: '실업급여·구직·창업자금',
    desc: '실업급여·구직촉진수당·국민취업지원·창업자금·고용장려금 등 일자리 관련 지원 제도 모음.',
  },
  '건강·의료': {
    subtitle: '의료비·건강검진·재활',
    desc: '건강보험 본인부담경감·의료급여·재난적의료비·건강검진 등 건강 관련 지원 제도 모음.',
  },
  '행정·안전': {
    subtitle: '민원·재난·소방·교통',
    desc: '민원편의·재난지원·교통안전·소방재난 등 행정과 안전 관련 지원 제도 모음.',
  },
  '임신·출산': {
    subtitle: '출산지원금·난임·육아수당',
    desc: '출산지원금·첫만남이용권·난임부부 시술지원·부모급여·아동수당 등 임신·출산 지원 제도 모음.',
  },
  '보호·돌봄': {
    subtitle: '노인·장애인·아동보호',
    desc: '노인장기요양·장애인활동지원·아동보호·한부모가족 등 보호와 돌봄 관련 지원 제도 모음.',
  },
  '문화·환경': {
    subtitle: '문화바우처·관광·환경보전',
    desc: '문화누리카드·통합문화이용권·관광지원·환경보전 등 문화와 환경 관련 지원 제도 모음.',
  },
  '농림·축산·어업': {
    subtitle: '농어업인·귀농·수산',
    desc: '농어업인 직불금·귀농귀촌·수산업·축산업 등 1차산업 종사자 지원 제도 모음.',
  },
};

async function getCategoryWithPolicies(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      _count: { select: { policies: true } },
      policies: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ featured: 'desc' }, { featuredOrder: 'asc' }, { publishedAt: 'desc' }],
        take: 30,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          tags: true, // 정책타입 자동 뱃지 추론에 활용
          geoRegion: true,
          viewCount: true,
          publishedAt: true,
          applyUrl: true,
          deadline: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { name: true, _count: { select: { policies: true } } },
  });
  if (!cat) return { title: '카테고리를 찾을 수 없습니다' };

  const meta = CATEGORY_META[cat.name];
  const title = `${cat.name} 지원금 · ${meta?.subtitle || '정부 복지 제도'}`;
  const description =
    meta?.desc ||
    `${cat.name} 분야의 정부 복지 제도 ${cat._count.policies}건을 한눈에. 신청 자격·방법·마감일까지.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: { canonical: `/welfare/categories/${params.slug}` },
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const cat = await getCategoryWithPolicies(params.slug);
  if (!cat) notFound();

  const meta = CATEGORY_META[cat.name];

  return (
    <div className="pb-20">
      {/* Category Hero — 카테고리별 고유 타이틀/설명 */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <CategoryIcon slug={cat.slug} size={28} />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{cat.name.replace(/·/g, ' ')} 지원금</h1>
            {meta?.subtitle && (
              <p className="text-blue-200 text-xs mt-0.5">{meta.subtitle}</p>
            )}
          </div>
        </div>
        <p className="text-blue-100 text-xs leading-relaxed mt-2">
          {meta?.desc || `${cat.name} 관련 정부·지자체 지원 제도 모음.`}
        </p>
        <p className="text-white/80 text-[11px] mt-2">
          총 <strong className="text-white">{cat._count.policies.toLocaleString()}건</strong> 의 제도
        </p>
      </section>

      {/* 빵부스러기 */}
      <nav className="px-4 py-2 text-[11px] text-gray-500 flex items-center gap-1">
        <Link href="/" className="hover:text-blue-600">홈</Link>
        <span>›</span>
        <Link href="/welfare/categories" className="hover:text-blue-600">카테고리</Link>
        <span>›</span>
        <span className="text-gray-800">{cat.name.replace(/·/g, ' ')}</span>
      </nav>

      {/* Policy Cards Grid */}
      <section className="px-4 pt-2 pb-4">
        {cat.policies.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            등록된 정책이 아직 없습니다. 다른 카테고리를 확인해보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cat.policies.map((p) => (
              <PolicyCard
                key={p.id}
                policy={{
                  slug: p.slug,
                  title: p.title,
                  excerpt: p.excerpt,
                  category: p.category,
                  geoRegion: p.geoRegion,
                  viewCount: p.viewCount,
                  publishedAt: p.publishedAt,
                  applyUrl: p.applyUrl,
                }}
                variant="default"
              />
            ))}
          </div>
        )}
      </section>

      {/* 관련 탐색 */}
      <section className="px-4 pt-3 pb-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
          <p className="text-sm font-bold text-gray-800">다른 카테고리도 둘러보세요</p>
          <p className="text-xs text-gray-500 mt-0.5">10개 분야의 지원 제도를 한곳에서</p>
          <Link
            href="/welfare/categories"
            className="inline-flex mt-2 text-xs font-medium text-white bg-blue-500 px-3 py-1.5 rounded-lg"
          >
            전체 카테고리 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
