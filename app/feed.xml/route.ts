import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * RSS 2.0 feed — 네이버 서치어드바이저 / 다음 웹마스터 / Feedly 등에 제출 가능.
 * 엔드포인트: https://www.govmate.co.kr/feed.xml
 *
 * - PUBLISHED 정책 최신 50개를 publishedAt(없으면 updatedAt) 내림차순으로 노출
 * - atom:self-link, dc:creator, content:encoded, 이미지 enclosure 포함
 * - Cache-Control: s-maxage=3600, stale-while-revalidate=86400 (Vercel Edge 캐시 + ISR)
 */

const SITE_URL = 'https://www.govmate.co.kr';
const FEED_URL = `${SITE_URL}/feed.xml`;
const SITE_TITLE = '복지길잡이 - 나에게 맞는 정부 지원금 찾기';
const SITE_DESC =
  '매일 업데이트되는 정부·지자체 복지 지원금, 생계·주거·교육·청년·창업 혜택을 한눈에. 복지길잡이 최신 정책 RSS 피드.';
const SITE_LANG = 'ko-KR';
const FEED_ITEM_LIMIT = 50;

export const revalidate = 3600; // 1시간마다 재생성
export const dynamic = 'force-static';

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(date: Date): string {
  // RSS 2.0은 RFC 822 날짜 형식 요구
  return date.toUTCString();
}

function stripHtml(text: string | null | undefined, maxLength = 500): string {
  if (!text) return '';
  const plain = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trimEnd() + '…';
}

export async function GET() {
  let policies: Array<{
    slug: string;
    title: string;
    description: string | null;
    excerpt: string | null;
    metaDesc: string | null;
    content: string;
    featuredImg: string | null;
    thumbnail: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  }> = [];

  try {
    policies = await prisma.policy.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        slug: true,
        title: true,
        description: true,
        excerpt: true,
        metaDesc: true,
        content: true,
        featuredImg: true,
        thumbnail: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      take: FEED_ITEM_LIMIT,
    });
  } catch (error) {
    console.error('[feed.xml] policy fetch error:', error);
  }

  const lastBuildDate = policies[0]?.publishedAt ?? policies[0]?.updatedAt ?? new Date();

  const items = policies
    .map((policy) => {
      const url = `${SITE_URL}/welfare/${encodeURIComponent(policy.slug)}`;
      const pubDate = toRfc822(policy.publishedAt ?? policy.updatedAt);
      const description =
        policy.metaDesc ||
        policy.description ||
        policy.excerpt ||
        stripHtml(policy.content, 300);
      const image = policy.featuredImg || policy.thumbnail;

      const enclosure = image
        ? `\n      <enclosure url="${escapeXml(image)}" type="image/jpeg" length="0" />`
        : '';

      return `    <item>
      <title>${escapeXml(policy.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>복지길잡이</dc:creator>
      <description>${escapeXml(stripHtml(description, 500))}</description>${enclosure}
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>${SITE_LANG}</language>
    <lastBuildDate>${toRfc822(lastBuildDate)}</lastBuildDate>
    <generator>Next.js on Vercel</generator>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex', // RSS 피드 자체는 인덱스 불필요
    },
  });
}
