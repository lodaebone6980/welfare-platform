import Link from 'next/link';
import { policyHref } from '@/lib/categories';

interface PolicyCardProps {
  policy: {
    slug: string;
    title: string;
    excerpt?: string | null;
    category?: { name: string; slug: string } | null;
    geoRegion?: string | null;
    viewCount?: number;
    publishedAt?: Date | string | null;
    tags?: string | null;
    /** 외부 신청 URL — 있으면 카드 하단에 카테고리별 CTA 버튼 노출 (같은 창, rel=nofollow) */
    applyUrl?: string | null;
    /** 마감일 문자열 — 없거나 "상시/수시/연중"이면 상시신청 뱃지 */
    deadline?: string | null;
  };
  variant?: 'default' | 'compact' | 'horizontal';
  /** 카드 하단에 "자료: 정부24·복지로" 출처 한 줄 노출 (default 기준 true) */
  showSource?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  '생활안정': 'bg-blue-50 text-blue-700',
  '주거·자립': 'bg-green-50 text-green-700',
  '보육·교육': 'bg-yellow-50 text-yellow-700',
  '고용·창업': 'bg-purple-50 text-purple-700',
  '건강·의료': 'bg-red-50 text-red-700',
  '행정·안전': 'bg-gray-50 text-gray-700',
  '임신·출산': 'bg-pink-50 text-pink-700',
  '보호·돌봄': 'bg-orange-50 text-orange-700',
  '문화·환경': 'bg-teal-50 text-teal-700',
  '농림·축산·어업': 'bg-lime-50 text-lime-700',
};

/** 카테고리별 CTA 라벨 — gg24/복지킹/govhelp 스타일처럼 카드마다 다른 액션 문구 노출 */
const CATEGORY_CTA: Record<string, string> = {
  '생활안정': '생계지원 신청',
  '주거·자립': '주거지원 신청',
  '보육·교육': '교육비 신청',
  '고용·창업': '일자리 신청',
  '건강·의료': '의료비 신청',
  '행정·안전': '민원 바로가기',
  '임신·출산': '출산혜택 신청',
  '보호·돌봄': '돌봄 신청',
  '문화·환경': '문화혜택 신청',
  '농림·축산·어업': '농어촌 지원',
};

function ctaLabel(categoryName?: string | null, hasApply?: boolean | null): string {
  if (!hasApply) return '자세히 보기';
  if (!categoryName) return '신청하기';
  return CATEGORY_CTA[categoryName] ?? '신청하기';
}

/** 카테고리명 표시용 — 중간점(·) 공백 치환 */
function displayCategoryName(name?: string | null): string {
  return (name || '').replace(/·/g, ' ');
}

/** 상시신청 여부 판별 — deadline이 없거나 상시/수시/연중이면 true */
function isAlwaysOpen(deadline?: string | null): boolean {
  const d = (deadline || '').trim();
  return !d || /상시|수시|연중|상시모집|상시접수/.test(d);
}

export default function PolicyCard({ policy, variant = 'default', showSource = true }: PolicyCardProps) {
  const categoryColor = CATEGORY_COLORS[policy.category?.name || ''] || 'bg-gray-50 text-gray-700';
  const publishDate = policy.publishedAt
    ? new Date(policy.publishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '';
  const detailHref = policyHref({ categorySlug: policy.category?.slug, slug: policy.slug });
  const cta = ctaLabel(policy.category?.name, !!policy.applyUrl);

  if (variant === 'compact') {
    return (
      <Link href={detailHref} className="block p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{policy.title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              {policy.category && (
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryColor}`}>
                  {displayCategoryName(policy.category.name)}
                </span>
              )}
              {policy.geoRegion && (
                <span className="text-[10px] text-gray-400">{policy.geoRegion}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <article className="relative group flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all min-h-[124px]">
        {/* 전체 블록 클릭 가능 — 아래 absolute overlay */}
        <Link
          href={detailHref}
          aria-label={policy.title}
          className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="relative z-10 flex-1 min-w-0 flex flex-col pointer-events-none">
          {policy.category && (
            <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-medium mb-2 ${categoryColor}`}>
              {displayCategoryName(policy.category.name)}
            </span>
          )}
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-tight">{policy.title}</h3>
          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
            {policy.excerpt ?? ' '}
          </p>
          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {policy.geoRegion && (
                <span className="text-xs text-gray-400">📍 {policy.geoRegion}</span>
              )}
              {publishDate && (
                <span className="text-xs text-gray-400">{publishDate}</span>
              )}
            </div>
            {policy.applyUrl ? (
              <a
                href={policy.applyUrl}
                rel="nofollow"
                className="pointer-events-auto relative z-20 shrink-0 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
              >
                {cta}
              </a>
            ) : (
              <span className="shrink-0 rounded border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600">
                {cta}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  // Default card — 전체 블록 클릭 + 카테고리별 CTA + 출처 라인
  return (
    <article className="relative group flex flex-col justify-between min-h-[196px] p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all">
      {/* 전체 블록 클릭 — overlay Link */}
      <Link
        href={detailHref}
        aria-label={policy.title}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200"
      />

      <div className="relative z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          {policy.category && (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${categoryColor}`}>
              {displayCategoryName(policy.category.name)}
            </span>
          )}
          {isAlwaysOpen(policy.deadline) ? (
            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              🔁 상시
            </span>
          ) : (
            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
              ⏰ 마감
            </span>
          )}
        </div>
        <h3 className="mt-2 text-base font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {policy.title}
        </h3>
        <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {policy.excerpt ?? ' '}
        </p>
      </div>

      <div className="relative z-10 mt-3 pt-3 border-t border-gray-50 space-y-1.5 pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {policy.geoRegion && (
              <span className="text-xs text-gray-400 truncate">📍 {policy.geoRegion}</span>
            )}
            {policy.viewCount !== undefined && policy.viewCount > 0 && (
              <span className="text-xs text-gray-400">👁 {policy.viewCount.toLocaleString()}</span>
            )}
            {publishDate && (
              <span className="text-xs text-gray-400">{publishDate}</span>
            )}
          </div>
          {policy.applyUrl ? (
            <a
              href={policy.applyUrl}
              rel="nofollow"
              className="pointer-events-auto relative z-20 shrink-0 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
            >
              {cta}
            </a>
          ) : (
            <span className="shrink-0 rounded border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600">
              {cta}
            </span>
          )}
        </div>

        {showSource && (
          <p className="text-[10px] text-gray-400">자료: 정부24·복지로 · 일부 내용 AI 요약</p>
        )}
      </div>
    </article>
  );
}
