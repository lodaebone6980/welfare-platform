import Link from 'next/link';

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
  };
  variant?: 'default' | 'compact' | 'horizontal';
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

export default function PolicyCard({ policy, variant = 'default' }: PolicyCardProps) {
  const categoryColor = CATEGORY_COLORS[policy.category?.name || ''] || 'bg-gray-50 text-gray-700';
  const publishDate = policy.publishedAt 
    ? new Date(policy.publishedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '';

  if (variant === 'compact') {
    return (
      <Link href={`/welfare/${policy.slug}`} className="block p-3 rounded-xl hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{policy.title}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              {policy.category && (
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryColor}`}>
                  {policy.category.name}
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
      <Link href={`/welfare/${policy.slug}`} className="flex gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all">
        <div className="flex-1 min-w-0">
          {policy.category && (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium mb-2 ${categoryColor}`}>
              {policy.category.name}
            </span>
          )}
          <h3 className="text-base font-bold text-gray-900 line-clamp-2 leading-tight">{policy.title}</h3>
          {policy.excerpt && (
            <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{policy.excerpt}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            {policy.geoRegion && (
              <span className="text-xs text-gray-400">📍 {policy.geoRegion}</span>
            )}
            {publishDate && (
              <span className="text-xs text-gray-400">{publishDate}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default card
  return (
    <Link href={`/welfare/${policy.slug}`} className="block p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all group">
      {policy.category && (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${categoryColor}`}>
          {policy.category.name}
        </span>
      )}
      <h3 className="mt-2 text-base font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
        {policy.title}
      </h3>
      {policy.excerpt && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">{policy.excerpt}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          {policy.geoRegion && (
            <span className="text-xs text-gray-400">📍 {policy.geoRegion}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {policy.viewCount !== undefined && policy.viewCount > 0 && (
            <span className="text-xs text-gray-400">👁 {policy.viewCount.toLocaleString()}</span>
          )}
          {publishDate && (
            <span className="text-xs text-gray-400">{publishDate}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
