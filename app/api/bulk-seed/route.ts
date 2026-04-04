import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const API_KEY = process.env.DATA_GO_KR_API_KEY || '';
const LIST_URL = 'https://api.odcloud.kr/api/gov24/v3/serviceList';
const DETAIL_URL = 'https://api.odcloud.kr/api/gov24/v3/serviceDetail';

const CATEGORY_MAP: Record<string, string> = {
  '생활안정': '지원금',
  '주거자립': '주거',
  '보육': '바우처',
  '교육': '교육',
  '고용': '고용',
  '보건의료': '의료',
  '행정안전': '지원금',
  '사회복지': '보조금',
  '문화체육관광': '문화',
  '환경': '지원금',
  '기타': '지원금',
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function generateSlug(title: string): string {
  const slug = title
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
  const suffix = Math.random().toString(36).substring(2, 8);
  return slug + '-' + suffix;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authKey = url.searchParams.get('key');

  if (!authKey || authKey !== API_KEY.substring(0, 8)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const maxPages = parseInt(url.searchParams.get('pages') || '10');
  const perPage = parseInt(url.searchParams.get('perPage') || '100');

  try {
    // Ensure categories exist
    const categories = [
      { name: '환급금', slug: 'refund', icon: '💰', displayOrder: 1 },
      { name: '바우처', slug: 'voucher', icon: '🎟️', displayOrder: 2 },
      { name: '지원금', slug: 'subsidy', icon: '💸', displayOrder: 3 },
      { name: '대출', slug: 'loan', icon: '🏦', displayOrder: 4 },
      { name: '보조금', slug: 'grant', icon: '🤝', displayOrder: 5 },
      { name: '교육', slug: 'education', icon: '🎓', displayOrder: 6 },
      { name: '주거', slug: 'housing', icon: '🏠', displayOrder: 7 },
      { name: '의료', slug: 'medical', icon: '🏥', displayOrder: 8 },
      { name: '고용', slug: 'employment', icon: '💼', displayOrder: 9 },
      { name: '문화', slug: 'culture', icon: '🎨', displayOrder: 10 },
    ];

    for (const cat of categories) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: { icon: cat.icon, displayOrder: cat.displayOrder },
        create: cat,
      });
    }

    const allCategories = await prisma.category.findMany();
    const catMap = new Map(allCategories.map(c => [c.name, c.id]));

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (let page = 1; page <= maxPages; page++) {
      try {
        const listResp = await fetch(
          `${LIST_URL}?page=${page}&perPage=${perPage}&serviceKey=${API_KEY}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (!listResp.ok) {
          totalErrors++;
          continue;
        }

        const listData = await listResp.json();
        const items = listData.data || [];

        if (items.length === 0) break;

        for (const item of items) {
          try {
            const svcId = item['서비스ID'] || item['SVC_ID'] || '';
            const title = item['서비스명'] || item['SVC_NM'] || '';
            if (!title) continue;

            // Determine category
            const rawCat = item['소관부처명'] || item['서비스분야'] || '';
            let catName = '지원금';
            for (const [key, val] of Object.entries(CATEGORY_MAP)) {
              if (rawCat.includes(key)) { catName = val; break; }
            }
            const categoryId = catMap.get(catName) || catMap.get('지원금') || 1;

            // Determine region
            const region = item['지자체코드'] || item['지역명'] || '';

            // Try to get detail
            let detail: any = {};
            if (svcId) {
              try {
                const detResp = await fetch(
                  `${DETAIL_URL}?page=1&perPage=1&cond[SVC_ID::EQ]=${svcId}&serviceKey=${API_KEY}`,
                  { headers: { 'Accept': 'application/json' } }
                );
                if (detResp.ok) {
                  const detData = await detResp.json();
                  detail = detData.data?.[0] || {};
                }
              } catch (e) { /* skip detail */ }
              await sleep(50);
            }

            const eligibility = detail['선정기준'] || detail['지원대상'] || item['선정기준'] || '';
            const applicationMethod = detail['신청방법'] || item['신청방법'] || '';
            const content = detail['서비스목적'] || detail['지원내용'] || item['지원내용'] || title;
            const applyUrl = detail['신청사이트URL'] || '';

            // Check for keywords to better categorize
            const titleLower = title.toLowerCase();
            if (titleLower.includes('환급') || titleLower.includes('장려금') || titleLower.includes('환불'))
              { if (catMap.has('환급금')) { /* reassign */ } }
            if (titleLower.includes('바우처') || titleLower.includes('쿠폰') || titleLower.includes('이용권'))
              { if (catMap.has('바우처')) { /* reassign */ } }
            if (titleLower.includes('대출') || titleLower.includes('융자'))
              { if (catMap.has('대출')) { /* reassign */ } }

            const slug = generateSlug(title);

            await prisma.policy.upsert({
              where: { externalId: svcId || slug },
              update: {
                title,
                content: `<h2>대상</h2><p>${eligibility}</p><h2>지원</h2><p>${content}</p><h2>신청</h2><p>${applicationMethod}</p>`,
                excerpt: content.substring(0, 100),
                eligibility,
                applicationMethod,
                categoryId,
                geoRegion: region,
                applyUrl,
                status: 'PUBLISHED',
              },
              create: {
                slug,
                title,
                content: `<h2>대상</h2><p>${eligibility}</p><h2>지원</h2><p>${content}</p><h2>신청</h2><p>${applicationMethod}</p>`,
                excerpt: content.substring(0, 100),
                eligibility,
                applicationMethod,
                categoryId,
                geoRegion: region,
                externalId: svcId || slug,
                externalUrl: applyUrl,
                applyUrl,
                status: 'PUBLISHED',
                publishedAt: new Date(),
              },
            });

            totalCreated++;
          } catch (itemErr) {
            totalErrors++;
          }
        }

        await sleep(300);
      } catch (pageErr) {
        totalErrors++;
      }
    }

    return NextResponse.json({
      success: true,
      totalCreated,
      totalUpdated,
      totalErrors,
      message: `Bulk seed completed: ${totalCreated} policies processed`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
