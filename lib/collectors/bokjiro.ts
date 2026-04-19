import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { enrichPolicyInput, mergeEnrich } from './enrich';

const API_KEY = process.env.DATA_GO_KR_KEY ?? '';
const API_URL =
  'https://apis.data.go.kr/B554287/NationalWelforeInformationsV001/getNationalWelforeInformationList';

export type CollectResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errorMsg?: string;
};

// XML helpers
function xmlVal(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

function guessCategory(title: string): string {
  if (/대출|전세자금|금리/.test(title)) return '대출';
  if (/바우처|이용권|카드|누리/.test(title)) return '바우처';
  if (/환급|장려금|EITC|크레딧/.test(title)) return '환급금';
  if (/보조|급여|활동지원/.test(title)) return '보조금';
  return '지원금';
}

function makeSlug(title: string): string {
  const base =
    title
      .replace(/[^\w가-힣\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'policy';
  return `${base}-${nanoid(6)}`;
}

type ParsedItem = {
  externalId: string;
  title: string;
  excerpt: string;
  content: string;
  applyUrl: string | null;
  jurisdiction: string | null;
  region: string | null;
};

function parseItems(xml: string): ParsedItem[] {
  const items = xml.match(/<servList>([\s\S]*?)<\/servList>/g) ?? [];
  const out: ParsedItem[] = [];
  for (const item of items) {
    const title = xmlVal(item, 'servNm');
    if (!title) continue;
    const servId = xmlVal(item, 'servId') || xmlVal(item, 'ServId');
    const digest = xmlVal(item, 'servDgst');
    out.push({
      externalId: servId || `bokjiro:${title}`,
      title,
      excerpt: digest || title,
      content: digest || '상세 내용은 해당 기관에 문의하세요.',
      applyUrl: xmlVal(item, 'servDtlLink') || null,
      jurisdiction:
        xmlVal(item, 'jurMnofNm') || xmlVal(item, 'jurOrgNm') || null,
      region: xmlVal(item, 'ctpvNm') || null,
    });
  }
  return out;
}

async function ensureCategories() {
  const CATEGORIES = [
    { name: '지원금', slug: 'subsidy' },
    { name: '보조금', slug: 'grant' },
    { name: '바우처', slug: 'voucher' },
    { name: '환급금', slug: 'refund' },
    { name: '대출', slug: 'loan' },
  ];
  const map: Record<string, number> = {};
  for (const c of CATEGORIES) {
    const r = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { name: c.name, slug: c.slug },
    });
    map[c.name] = r.id;
  }
  return map;
}

export async function collectBokjiro(
  opts: { rows?: number; pages?: number; publish?: boolean } = {},
): Promise<CollectResult> {
  const rows = opts.rows ?? 50;
  const pages = opts.pages ?? 1;
  const autoPublish = opts.publish ?? false;

  if (!API_KEY) {
    return {
      fetched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errorMsg:
        'DATA_GO_KR_KEY 환경변수가 없습니다. Vercel/로컬 .env에 설정하세요.',
    };
  }

  const categoryMap = await ensureCategories();

  let created = 0,
    updated = 0,
    skipped = 0,
    fetched = 0;

  for (let page = 1; page <= pages; page++) {
    const url = `${API_URL}?serviceKey=${encodeURIComponent(
      API_KEY,
    )}&numOfRows=${rows}&pageNo=${page}`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        fetched,
        created,
        updated,
        skipped,
        errorMsg: `API ${res.status} ${res.statusText} (page ${page})`,
      };
    }

    const xml = await res.text();

    if (xml.includes('<errMsg>') || xml.includes('Unexpected errors')) {
      return {
        fetched,
        created,
        updated,
        skipped,
        errorMsg: xml.slice(0, 300),
      };
    }

    const items = parseItems(xml);
    fetched += items.length;
    if (items.length === 0) break;

    for (const p of items) {
      const cat = guessCategory(p.title);
      const categoryId = categoryMap[cat] ?? categoryMap['지원금'];

      const existing = await prisma.policy.findUnique({
        where: { externalId: p.externalId },
      });

      if (existing) {
        const changed =
          existing.title !== p.title ||
          existing.excerpt !== p.excerpt ||
          existing.applyUrl !== p.applyUrl;
        if (changed) {
          await prisma.policy.update({
            where: { id: existing.id },
            data: {
              title: p.title,
              excerpt: p.excerpt,
              content:
                p.content.length > (existing.content?.length ?? 0)
                  ? p.content
                  : existing.content,
              applyUrl: p.applyUrl ?? existing.applyUrl,
              geoRegion: p.region ?? existing.geoRegion,
            },
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      await prisma.policy.create({
        data: {
          externalId: p.externalId,
          externalUrl: p.applyUrl,
          slug: makeSlug(p.title),
          title: p.title,
          content: `<p>${p.content}</p>`,
          excerpt: p.excerpt,
          focusKeyword: p.title.split(' ').slice(0, 3).join(' '),
          metaDesc: p.excerpt.slice(0, 155),
          status: autoPublish ? 'PUBLISHED' : 'DRAFT',
          categoryId,
          geoRegion: p.region,
          applyUrl: p.applyUrl,
          publishedAt: autoPublish ? new Date() : null,
        },
      });
      created++;
    }
  }

  return { fetched, created, updated, skipped };
}


/**
 * Bokjiro 수집기 결과를 DB 에 쓰기 직전에 호출하는 enrich 래퍼.
 * - resolveCategoryAndRegion 기반 categoryId / geoRegion 보강
 * - 이미 지정된 값이 있으면 덮어쓰지 않음
 *
 * 사용 예:
 *   const enriched = await enrichBokjiroPayload(payload);
 *   await prisma.policy.create({ data: enriched });
 */
export async function enrichBokjiroPayload<
  T extends {
    title?: string | null;
    description?: string | null;
    excerpt?: string | null;
    eligibility?: string | null;
    focusKeyword?: string | null;
    categoryId?: number | null;
    geoRegion?: string | null;
  },
>(payload: T): Promise<T> {
  const e = await enrichPolicyInput({
    title: payload.title,
    description: payload.description,
    excerpt: payload.excerpt,
    eligibility: payload.eligibility,
    focusKeyword: payload.focusKeyword,
    categoryId: payload.categoryId ?? undefined,
    geoRegion: payload.geoRegion ?? undefined,
  });
  return mergeEnrich(payload, e);
}
