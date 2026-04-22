'use client';

import { useState } from 'react';

type Candidate = {
  kind: 'naver-news' | 'gov-rss';
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
};

function formatDate(raw: string): string {
  if (!raw) return '-';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const now = Date.now();
  const diffH = Math.floor((now - d.getTime()) / (1000 * 60 * 60));
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function TrendingNewsClient({ items }: { items: Candidate[] }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string; policyId?: number }>>({});

  async function handleDraft(item: Candidate) {
    const key = item.link;
    if (busyKey) return;
    setBusyKey(key);
    try {
      const res = await fetch('/api/admin/trends/news/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) {
        setResults((p) => ({ ...p, [key]: { ok: false, msg: data.error || `등록 실패 (${res.status})` } }));
      } else {
        setResults((p) => ({
          ...p,
          [key]: { ok: true, msg: '초안 생성 완료', policyId: data.policyId },
        }));
      }
    } catch (err) {
      setResults((p) => ({ ...p, [key]: { ok: false, msg: (err as Error).message } }));
    } finally {
      setBusyKey(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        조건에 맞는 뉴스가 없습니다. Naver API 설정 또는 `lib/collectors/gov-rss.ts` 의 `GOV_RSS_FEEDS` 를 확인하세요.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        const key = it.link;
        const result = results[key];
        return (
          <li
            key={key}
            className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      it.kind === 'gov-rss'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {it.kind === 'gov-rss' ? '부처' : 'Naver'}
                  </span>
                  <span>{it.source}</span>
                  <span className="text-gray-300">·</span>
                  <span>{formatDate(it.pubDate)}</span>
                </div>
                <a
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block text-sm font-semibold text-gray-900 hover:text-blue-700 line-clamp-2"
                >
                  {it.title}
                </a>
                {it.description && (
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">{it.description}</p>
                )}
                {result && (
                  <div
                    className={`mt-2 text-xs ${
                      result.ok ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {result.msg}
                    {result.policyId && (
                      <>
                        {' '}
                        —{' '}
                        <a
                          href={`/content/policy/${result.policyId}/edit`}
                          className="underline"
                        >
                          편집하기
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDraft(it)}
                disabled={busyKey === key || result?.ok}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {busyKey === key ? '등록 중...' : result?.ok ? '등록됨' : '초안 등록'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
