import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PageContent from '@/components/PageContent';

const SLUG = 'about';

const DEFAULT_TITLE = '서비스 소개';
const DEFAULT_CONTENT = `## 복지길잡이가 만들어진 이유

정부와 지자체에서 제공하는 복지 혜택은 매년 수천 개에 달하지만, 정작 필요한 정보가 어디에 있는지, 내가 신청할 수 있는 조건인지 파악하기가 쉽지 않습니다.

복지길잡이는 복잡하게 흩어져 있는 정부 복지 정책을 한 곳에 모아, **누구나 쉽게 검색하고 자신에게 맞는 혜택을 찾을 수 있도록** 만든 민간 정보 서비스입니다.

## 무엇이 다른가요

- **통합 검색**: 중앙·지자체 복지 정책을 하나의 검색창에서 찾습니다.
- **맞춤 추천**: 연령·지역·소득 조건 등으로 나에게 맞는 혜택을 우선 노출합니다.
- **카테고리 탐색**: 주거·취업·의료·교육·육아 등 주제별로 혜택을 묶어 보여줍니다.
- **신규 정책 알림**: 관심 카테고리에 신규 정책이 등록되면 알려드립니다. (선택)
- **모바일 최적화**: 언제 어디서나 편리하게 이용할 수 있습니다.

## 정보의 출처

복지길잡이는 다음 공공 데이터를 기반으로 정보를 수집·가공합니다.

- 공공데이터포털 (data.go.kr) OpenAPI
- 중앙정부 및 지자체 공식 공고
- 복지로(bokjiro.go.kr) 등 공공기관 공개 정보

정보는 정기적으로 자동 수집되지만, 실제 신청 시점의 정확한 조건·일정은 반드시 **소관 부처 및 지자체의 공식 안내**를 확인해 주시기 바랍니다.

## 운영

- 서비스명: 복지길잡이 (govmate)
- 도메인: www.govmate.co.kr
- 운영사: 블루엣지
- 문의: adenly659@gmail.com

## 민간 정보 서비스 안내

**본 서비스는 정부 공식 사이트가 아닙니다.** 복지길잡이는 공공 데이터를 기반으로 정보를 가공·제공하는 민간 서비스이며, 서비스 운영에는 Google AdSense 광고 및 제휴 마케팅 링크를 통한 수익이 사용될 수 있습니다. 자세한 내용은 이용약관과 개인정보처리방침을 참고해 주세요.`;

export const metadata: Metadata = {
  title: '서비스 소개 | 복지길잡이',
  description:
    '복지길잡이가 어떤 서비스인지, 정보의 출처와 운영 방식에 대해 안내합니다.',
  alternates: { canonical: 'https://www.govmate.co.kr/about' },
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function AboutPage() {
  let title = DEFAULT_TITLE;
  let content = DEFAULT_CONTENT;
  let updatedAt: Date | null = null;
  try {
    const row = await prisma.sitePage.findUnique({ where: { slug: SLUG } });
    if (row) {
      title = row.title;
      content = row.content;
      updatedAt = row.updatedAt;
    }
  } catch (e) {
    console.error('[about] prisma query failed:', e);
  }
  return <PageContent title={title} content={content} updatedAt={updatedAt} />;
}
