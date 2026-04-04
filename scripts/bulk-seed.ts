// scripts/bulk-seed.ts
// data.go.kr API에서 대량 복지 정책 데이터 수집
import { PrismaClient } from '@prisma/client';
import { WELFARE_CATEGORIES, mapCategoryCode, generatePolicySlug, mapRegionCode } from '../lib/category-mapper';

const prisma = new PrismaClient();

const API_KEY = process.env.DATA_GO_KR_API_KEY || '';
const BASE_URL = 'https://apis.data.go.kr/B554287/NationalWelfareInformations/NationalWelfreInformationList';
const DETAIL_URL = 'https://apis.data.go.kr/B554287/NationalWelfareInformations/NationalWelfreInformation';

interface WelfareItem {
  servId: string;
  servNm: string;
  servDgst: string;
  jurMnofNm: string;
  svcfldNm: string;
  lifeNmArray?: string;
  trgterIndvdlArray?: string;
  intrsThemaNmArray?: string;
}

interface WelfareDetail {
  servId: string;
  servNm: string;
  servDgst: string;
  aplyMtdCn: string;
  slctCritCn: string;
  alwServCn: string;
  aplyUrlAddr: string;
  servDtlLink: string;
  inqNum: string;
  bizChrDeptNm: string;
  lastModYmd: string;
}

async function seedCategories() {
  console.log('Seeding categories...');
  for (const cat of WELFARE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, displayOrder: cat.displayOrder },
      create: { name: cat.name, slug: cat.slug, icon: cat.icon, displayOrder: cat.displayOrder },
    });
  }
  console.log('Categories seeded:', WELFARE_CATEGORIES.length);
}

async function fetchWelfareList(page: number = 1, perPage: number = 100): Promise<{ totalCount: number; items: WelfareItem[] }> {
  const url = new URL(BASE_URL);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('callTp', 'L');
  url.searchParams.set('pageNo', String(page));
  url.searchParams.set('numOfRows', String(perPage));
  url.searchParams.set('srchKeyCode', '003');
  url.searchParams.set('dataType', 'json');

  const resp = await fetch(url.toString());
  const data = await resp.json();
  
  const totalCount = data?.totalCount || 0;
  const items = data?.servList || [];
  
  return { totalCount, items };
}

async function fetchWelfareDetail(servId: string): Promise<WelfareDetail | null> {
  const url = new URL(DETAIL_URL);
  url.searchParams.set('serviceKey', API_KEY);
  url.searchParams.set('callTp', 'D');
  url.searchParams.set('servId', servId);
  url.searchParams.set('dataType', 'json');

  try {
    const resp = await fetch(url.toString());
    const data = await resp.json();
    return data?.welfareInfo || null;
  } catch (e) {
    console.error('Detail fetch error for', servId, e);
    return null;
  }
}

async function upsertPolicy(item: WelfareItem, detail: WelfareDetail | null) {
  const categoryName = mapCategoryCode(item.svcfldNm || '');
  const category = await prisma.category.findFirst({ where: { name: categoryName } });
  
  const slug = generatePolicySlug(item.servNm, item.servId);
  const excerpt = item.servDgst?.substring(0, 200) || '';
  
  const content = buildContent(item, detail);
  
  await prisma.policy.upsert({
    where: { externalId: item.servId },
    update: {
      title: item.servNm,
      content,
      excerpt,
      description: item.servDgst || null,
      eligibility: detail?.slctCritCn || null,
      applicationMethod: detail?.aplyMtdCn || null,
      applyUrl: detail?.aplyUrlAddr || detail?.servDtlLink || null,
      externalUrl: detail?.servDtlLink || null,
      categoryId: category?.id || null,
      status: 'PUBLISHED',
      tags: [item.lifeNmArray, item.trgterIndvdlArray, item.intrsThemaNmArray].filter(Boolean).join(','),
      updatedAt: new Date(),
    },
    create: {
      slug,
      title: item.servNm,
      content,
      excerpt,
      description: item.servDgst || null,
      eligibility: detail?.slctCritCn || null,
      applicationMethod: detail?.aplyMtdCn || null,
      applyUrl: detail?.aplyUrlAddr || detail?.servDtlLink || null,
      externalUrl: detail?.servDtlLink || null,
      externalId: item.servId,
      categoryId: category?.id || null,
      geoRegion: mapRegionCode(item.jurMnofNm || '') || '전국',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      tags: [item.lifeNmArray, item.trgterIndvdlArray, item.intrsThemaNmArray].filter(Boolean).join(','),
    },
  });
}

function buildContent(item: WelfareItem, detail: WelfareDetail | null): string {
  let content = '<article class="policy-detail">';
  content += '<h2>서비스 개요</h2>';
  content += '<p>' + (item.servDgst || '') + '</p>';
  
  if (detail?.slctCritCn) {
    content += '<h2>선정 기준</h2>';
    content += '<p>' + detail.slctCritCn + '</p>';
  }
  if (detail?.alwServCn) {
    content += '<h2>서비스 내용</h2>';
    content += '<p>' + detail.alwServCn + '</p>';
  }
  if (detail?.aplyMtdCn) {
    content += '<h2>신청 방법</h2>';
    content += '<p>' + detail.aplyMtdCn + '</p>';
  }
  if (detail?.inqNum) {
    content += '<h2>문의처</h2>';
    content += '<p>' + detail.inqNum + '</p>';
  }
  content += '</article>';
  return content;
}

async function main() {
  console.log('Starting bulk seed...');
  
  await seedCategories();
  
  // Fetch first page to get total count
  const { totalCount, items: firstPageItems } = await fetchWelfareList(1, 100);
  console.log('Total welfare items:', totalCount);
  
  const totalPages = Math.min(Math.ceil(totalCount / 100), 50); // Max 50 pages = 5000 items
  console.log('Total pages to fetch:', totalPages);
  
  let processed = 0;
  
  // Process first page
  for (const item of firstPageItems) {
    try {
      const detail = await fetchWelfareDetail(item.servId);
      await upsertPolicy(item, detail);
      processed++;
      if (processed % 10 === 0) console.log('Processed:', processed);
      // Rate limiting - 100ms delay between detail requests
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error('Error processing', item.servId, e);
    }
  }
  
  // Process remaining pages
  for (let page = 2; page <= totalPages; page++) {
    console.log('Fetching page', page, '/', totalPages);
    try {
      const { items } = await fetchWelfareList(page, 100);
      for (const item of items) {
        try {
          const detail = await fetchWelfareDetail(item.servId);
          await upsertPolicy(item, detail);
          processed++;
          if (processed % 10 === 0) console.log('Processed:', processed);
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          console.error('Error processing', item.servId, e);
        }
      }
    } catch (e) {
      console.error('Error fetching page', page, e);
    }
    // Delay between pages
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('Bulk seed complete. Total processed:', processed);
  
  // Update API source tracking
  await prisma.apiSource.upsert({
    where: { name: 'data.go.kr-welfare' },
    update: { lastSuccess: new Date(), totalCount: processed },
    create: {
      name: 'data.go.kr-welfare',
      url: BASE_URL,
      type: 'REST',
      status: 'active',
      lastSuccess: new Date(),
      totalCount: processed,
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
