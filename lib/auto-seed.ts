// lib/auto-seed.ts
import { prisma } from './prisma';
import { WELFARE_CATEGORIES, mapCategoryCode, generatePolicySlug } from './category-mapper';

const API_KEY = process.env.DATA_GO_KR_API_KEY || '';
const BASE_URL = 'https://apis.data.go.kr/B554287/NationalWelfareInformations/NationalWelfreInformationList';

let isSeeding = false;

export async function autoSeedIfEmpty() {
  if (isSeeding) return;
  
  const count = await prisma.policy.count({ where: { status: 'PUBLISHED' } });
  if (count > 0) return; // Already has data
  
  isSeeding = true;
  console.log('[auto-seed] No published policies found. Starting seed...');
  
  try {
    // Seed categories first
    for (const cat of WELFARE_CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, icon: cat.icon, displayOrder: cat.displayOrder },
        create: { name: cat.name, slug: cat.slug, icon: cat.icon, displayOrder: cat.displayOrder },
      });
    }
    console.log('[auto-seed] Categories seeded');

    if (!API_KEY) {
      console.log('[auto-seed] No API key, seeding sample data...');
      await seedSampleData();
      return;
    }

    // Fetch from data.go.kr API
    const url = new URL(BASE_URL);
    url.searchParams.set('serviceKey', API_KEY);
    url.searchParams.set('callTp', 'L');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '100');
    url.searchParams.set('srchKeyCode', '003');
    url.searchParams.set('dataType', 'json');

    const resp = await fetch(url.toString());
    const data = await resp.json();
    const items = data?.servList || [];
    
    console.log('[auto-seed] Fetched', items.length, 'items from API');

    for (const item of items) {
      try {
        const categoryName = mapCategoryCode(item.svcfldNm || '');
        const category = await prisma.category.findFirst({ where: { name: categoryName } });
        const slug = generatePolicySlug(item.servNm, item.servId);

        await prisma.policy.upsert({
          where: { externalId: item.servId },
          update: {
            title: item.servNm,
            excerpt: item.servDgst?.substring(0, 200) || '',
            status: 'PUBLISHED',
            categoryId: category?.id || null,
          },
          create: {
            slug,
            title: item.servNm,
            content: '<p>' + (item.servDgst || item.servNm) + '</p>',
            excerpt: item.servDgst?.substring(0, 200) || '',
            description: item.servDgst || null,
            externalId: item.servId,
            categoryId: category?.id || null,
            geoRegion: '전국',
            status: 'PUBLISHED',
            publishedAt: new Date(),
            tags: [item.lifeNmArray, item.trgterIndvdlArray].filter(Boolean).join(','),
          },
        });
      } catch (e) {
        console.error('[auto-seed] Error processing item:', item.servId, e);
      }
    }
    
    const finalCount = await prisma.policy.count({ where: { status: 'PUBLISHED' } });
    console.log('[auto-seed] Complete. Total published:', finalCount);
    
  } catch (error) {
    console.error('[auto-seed] Error:', error);
  } finally {
    isSeeding = false;
  }
}

async function seedSampleData() {
  const samplePolicies = [
    { title: '청년 월세 지원', excerpt: '무주택 청년 월세 지원 (최대 월 20만원)', category: '주거·자립', region: '전국' },
    { title: '기초생활보장 생계급여', excerpt: '기초생활수급자 생계 지원', category: '생활안정', region: '전국' },
    { title: '청년 취업성공패키지', excerpt: '청년 취업 지원 프로그램', category: '고용·창업', region: '전국' },
    { title: '영유아 보육료 지원', excerpt: '0-5세 영유아 보육료 지원', category: '보육·교육', region: '전국' },
    { title: '국민건강보험료 경감', excerpt: '저소득층 건강보험료 경감', category: '건강·의료', region: '전국' },
    { title: '임산부 의료비 지원', excerpt: '임산부 의료비 바우처 지원', category: '임신·출산', region: '전국' },
    { title: '노인 돌봄서비스', excerpt: '독거노인 돌봄 지원 서비스', category: '보호·돌봄', region: '전국' },
    { title: '문화누리카드', excerpt: '저소득층 문화생활 지원', category: '문화·환경', region: '전국' },
  ];

  for (const sp of samplePolicies) {
    const category = await prisma.category.findFirst({ where: { name: sp.category } });
    const slug = generatePolicySlug(sp.title);
    
    await prisma.policy.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title: sp.title,
        content: '<p>' + sp.excerpt + '</p>',
        excerpt: sp.excerpt,
        categoryId: category?.id || null,
        geoRegion: sp.region,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }
  console.log('[auto-seed] Sample data seeded');
}
