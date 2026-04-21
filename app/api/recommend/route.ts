import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const age = url.searchParams.get('age') || '';
  const income = url.searchParams.get('income') || '';
  const household = url.searchParams.get('household') || '';
  const region = url.searchParams.get('region') || '';
  const employment = url.searchParams.get('employment') || '';
  const interests = url.searchParams.get('interests')?.split(',').filter(Boolean) || [];
  const applyType = url.searchParams.get('applyType') || ''; // '' | 'always' | 'deadline'

  try {
    // Build where clause
    const where: any = {
      status: 'PUBLISHED',
    };

    // Region filter
    if (region) {
      where.OR = [
        { geoRegion: { contains: region } },
        { geoRegion: null },
        { geoRegion: '' },
      ];
    }

    // Category/interest filter
    if (interests.length > 0) {
      const categories = await prisma.category.findMany({
        where: { name: { in: interests } },
        select: { id: true },
      });
      if (categories.length > 0) {
        where.categoryId = { in: categories.map(c => c.id) };
      }
    }

    // Fetch matching policies
    let policies = await prisma.policy.findMany({
      where,
      include: { category: true },
      orderBy: { viewCount: 'desc' },
      take: 100,
    });

    // Apply-type filter (상시/마감)
    if (applyType === 'always') {
      policies = policies.filter(p => {
        const d = (p.deadline || '').trim();
        return !d || /상시|수시|연중|상시모집|상시접수/.test(d);
      });
    } else if (applyType === 'deadline') {
      policies = policies.filter(p => {
        const d = (p.deadline || '').trim();
        return d && !/상시|수시|연중|상시모집|상시접수/.test(d);
      });
    }

    // Apply text-based filtering for age, income, household, employment
    // These are matched against eligibility text
    // 완화된 매칭: 하나라도 매칭되면 포함 (score > 0), 매칭이 없으면 뒤로
    if (age || income || household || employment) {
      policies = policies.map(policy => {
        const eligText = (policy.eligibility || '').toLowerCase() + ' ' + (policy.title || '').toLowerCase() + ' ' + (policy.content || '').toLowerCase() + ' ' + (policy.excerpt || '').toLowerCase();
        let score = 0;
        let maxScore = 0;

        // Age matching
        if (age) {
          maxScore++;
          const ageKeywords: Record<string, string[]> = {
            '청소년': ['청소년', '미성년', '아동', '유아', '초등', '중학', '고등'],
            '청년(19-34)': ['청년', '19세', '34세', '대학', '취업', '취준'],
            '중년(35-49)': ['중년', '장년', '근로'],
            '장년(50-64)': ['장년', '시니어', '50세', '중고령'],
            '어르신(65+)': ['어르신', '노인', '65세', '경로', '기초연금'],
          };
          const keywords = ageKeywords[age] || [];
          if (keywords.some(k => eligText.includes(k)) || age === '전체') score++;
        }

        // Income matching
        if (income) {
          maxScore++;
          const incomeKeywords: Record<string, string[]> = {
            '기초수급': ['기초수급', '기초생활', '저소득', '차상위'],
            '차상위': ['차상위', '중위소득 50', '저소득'],
            '중위소득': ['중위소득', '소득'],
            '제한없음': [],
          };
          const keywords = incomeKeywords[income] || [];
          if (keywords.length === 0 || keywords.some(k => eligText.includes(k))) score++;
        }

        // Household matching
        if (household) {
          maxScore++;
          const householdKeywords: Record<string, string[]> = {
            '단독가구': ['단독', '1인', '독거'],
            '한부모가족': ['한부모', '한부', '모자녀'],
            '맞벌이가구': ['맞벌이', '부부'],
            '다자녀가구': ['다자녀', '다자'],
            '신혼부부': ['신혼', '결혼', '출산'],
            '전체': [],
          };
          const keywords = householdKeywords[household] || [];
          if (keywords.length === 0 || keywords.some(k => eligText.includes(k))) score++;
        }

        // Employment matching
        if (employment) {
          maxScore++;
          const empKeywords: Record<string, string[]> = {
            '구직중': ['구직', '취업', '실업', '구직활동'],
            '재직자': ['재직', '근로자', '임금'],
            '자영업자': ['자영업', '소상공인', '사업자', '소상공'],
            '학생': ['학생', '대학', '장학'],
            '주부/육아': ['육아', '보육', '임신', '출산', '주부'],
            '전체': [],
          };
          const keywords = empKeywords[employment] || [];
          if (keywords.length === 0 || keywords.some(k => eligText.includes(k))) score++;
        }

        // 매칭 점수 계산: 점수가 있으면 가점, 없어도 포함 (관대한 매칭)
        return { policy, score, maxScore };
      }).sort((a, b) => {
        // 점수 우선, 그 다음 조회수
        if (b.score !== a.score) return b.score - a.score;
        return (b.policy.viewCount || 0) - (a.policy.viewCount || 0);
      }).map(x => x.policy);
    }

    // Sort by relevance (matching policies first) - only when no text filter applied
    if (!(age || income || household || employment)) {
      policies.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }

    return NextResponse.json({
      success: true,
      total: policies.length,
      policies: policies.map(p => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        eligibility: p.eligibility,
        applicationMethod: p.applicationMethod,
        geoRegion: p.geoRegion,
        deadline: p.deadline,
        category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
      })),
    });
  } catch (error: any) {
    console.error('Recommend API error:', error);
    return NextResponse.json({ error: error.message, policies: [], total: 0 }, { status: 500 });
  }
}
