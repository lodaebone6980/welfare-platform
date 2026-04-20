import React from 'react';

/**
 * 심플 마크다운 유사 문법 → JSX 렌더러.
 *   # 제목        → h1
 *   ## 소제목     → h2
 *   ### 소소제목  → h3
 *   - 리스트      → <ul><li>
 *   빈 줄        → 단락 구분
 *   그 외        → <p> (연속된 줄은 공백으로 합침)
 *
 * XSS 안전: innerHTML 사용 안 함. admin 이 입력한 내용도 모두 텍스트로 처리.
 */
function renderContent(content: string): React.ReactNode {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      nodes.push(
        <p key={key++} className="mb-4 leading-relaxed text-gray-700">
          {paragraph.join(' ')}
        </p>
      );
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      nodes.push(
        <ul key={key++} className="mb-4 list-disc pl-5 space-y-1.5 text-gray-700">
          {list.map((li, i) => (
            <li key={i} className="leading-relaxed">
              {li}
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flushParagraph();
      flushList();
    } else if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold mt-5 mb-2 text-gray-900">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      nodes.push(
        <h2 key={key++} className="text-base font-semibold mt-6 mb-3 text-gray-900">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      nodes.push(
        <h1 key={key++} className="text-lg font-bold mt-6 mb-3 text-gray-900">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return nodes;
}

export default function PageContent({
  title,
  content,
  updatedAt,
}: {
  title: string;
  content: string;
  updatedAt?: Date | string | null;
}) {
  const dateStr = updatedAt
    ? new Date(updatedAt).toISOString().slice(0, 10)
    : null;
  return (
    <article className="bg-white px-4 py-6 min-h-screen">
      <header className="mb-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {dateStr && (
          <p className="mt-2 text-xs text-gray-400">최종 업데이트: {dateStr}</p>
        )}
      </header>
      <div className="text-sm">{renderContent(content)}</div>
    </article>
  );
}
