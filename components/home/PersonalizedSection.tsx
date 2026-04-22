'use client';

/**
 * 홈 상단 "내게 맞는 지원금" 섹션
 * ------------------------------------------------------------------
 * - recommend 페이지에서 localStorage.wp_profile 에 저장된 조건 로드
 * - 있으면 /api/recommend 호출 → 최대 4건 노출
 * - 없으면 null 반환 (홈 레이아웃에 영향 X)
 *
 * 서버 컴포넌트(home page)의 ISR 캐시를 유지하기 위해
 * 클라이언트 사이드 페칭만 사용한다.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Policy = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  geoRegion: string | null;
  deadline: string | null;
  category: { name: string; slug: string } | null;
};

function cleanTitle(title: string): string {
  return (title || '')
    .replace(/^[\s]*[\[\(\【\「\『][^\]\)\】\」\』]{0,30}[\]\)\】\」\』]\s*/g, '')
    .replace(/^\s*20\d{2}년?\s*[-ㆍ·]?\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function policyHref(p: Policy): string {
  const catSlug = p.category?.slug;
  if (catSlug) return `/${catSlug}/${encodeURIComponent(p.slug)}`;
  return `/welfare/${encodeURIComponent(p.slug)}`;
}

function hasProfile(): boolean {
  try {
    const raw = localStorage.getItem('wp_profile');
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj !== null;
  } catch {
    return false;
  }
}

function buildQuery(): string {
  try {
    const raw = localStorage.getItem('wp_profile');
    if (!raw) return '';
    const obj = JSON.parse(raw) as Record<string, any>;
    const qs = new URLSearchParams();
    if (obj.age) qs.set('age', obj.age);
    if (obj.income) qs.set('income', obj.income);
    if (obj.household) qs.set('household', obj.household);
    if (obj.region && obj.region !== '전체') qs.set('region', obj.region);
    if (obj.employment) qs.set('employment', obj.employment);
    if (Array.isArray(obj.interests) && obj.interests.length > 0) {
      qs.set('interests', obj.interests.join(','));
    }
    if (obj.applyType) qs.set('applyType', obj.applyType);
    return qs.toString();
  } catch {
    return '';
  }
}

export default function PersonalizedSection() {
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasProfile()) {
        setLoading(false);
        return;
      }
      const q = buildQuery();
      try {
        const res = await fetch(`/api/recommend?${q}&limit=4`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setPolicies((data.policies || []).slice(0, 4));
      } catch {
        // 조용히 실패
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!policies || policies.length === 0) return null;

  return (
    <section className="px-4 pt-5 pb-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
          <span className="text-lg">🎯</span> 내게 맞는 지원금
        </h2>
        <Link href="/recommend" className="text-xs text-blue-600">
          조건 변경
        </Link>
      </div>
      <p className="text-[11px] text-gray-400 mb-2">
        저장된 조건 기반 추천 · 일치도 순
      </p>
      <div className="space-y-0 bg-white rounded-2xl border overflow-hidden">
        {policies.map((p) => (
          <Link
            key={p.id}
            href={policyHref(p)}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {cleanTitle(p.title)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {p.category && (
                  <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {p.category.name.replace(/·/g, ' ')}
                  </span>
                )}
                <span className="text-[10px] text-gray-400">{p.geoRegion || '전국'}</span>
              </div>
            </div>
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
              자세히
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
