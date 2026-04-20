import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PageContent from '@/components/PageContent';

const SLUG = 'contact';

const DEFAULT_TITLE = '문의하기';
const DEFAULT_CONTENT = `복지길잡이 이용 중 불편하신 점, 개선 제안, 제휴·광고 문의 사항이 있으시면 아래 채널을 이용해 주세요. 가능한 한 빠르게 답변 드리겠습니다.

## 이메일 문의

가장 빠르고 확실한 문의 방법입니다. 평균 **1~3영업일 이내**에 회신드립니다.

- 이메일: **adenly659@gmail.com**

### 이메일 작성 시 권장 형식

- 제목: [문의 유형] 간단한 내용 요약
- 본문: 어떤 페이지에서 어떤 문제가 발생했는지 구체적으로 기재
- 첨부: 스크린샷 또는 오류 화면 (문제 해결에 큰 도움이 됩니다)

## 문의 유형별 안내

### 1. 서비스 이용 문의

검색이 되지 않거나, 알림이 오지 않거나, 페이지가 로드되지 않는 등 기술적인 문제가 있으신 경우 이메일로 문의 주시면 원인을 파악해 안내 드립니다.

### 2. 정보 수정 요청

특정 복지 정책 정보가 잘못되었거나, 이미 종료된 사업인 경우 정책 페이지 URL 과 함께 알려주시면 검토 후 수정하거나 비공개 처리합니다.

### 3. 개인정보 관련 문의

개인정보의 열람·수정·삭제, 알림 수신 해지 등은 이메일로 요청해 주시기 바랍니다. 이용자 본인 확인 후 처리됩니다.

### 4. 제휴·광고 문의

복지 관련 서비스·상품을 운영하시는 분들의 제휴 제안을 환영합니다. 회사 소개, 제휴 방식, 기대 효과 등을 함께 보내주시면 검토 후 회신드립니다.

## 운영자 정보

- 서비스명: 복지길잡이 (www.govmate.co.kr)
- 운영사: 블루엣지
- 이메일: adenly659@gmail.com

## 유의사항

- 본 서비스는 정부 공식 사이트가 아니므로, **특정 복지 혜택의 신청·지급에 관한 직접적인 문의는 해당 부처 또는 지자체**로 문의해 주시기 바랍니다.
- 욕설·비방·광고성 스팸 메일은 답변드리지 않습니다.`;

export const metadata: Metadata = {
  title: '문의하기 | 복지길잡이',
  description:
    '복지길잡이 서비스 이용, 정보 수정, 제휴·광고 등 문의 방법을 안내합니다.',
  alternates: { canonical: 'https://www.govmate.co.kr/contact' },
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function ContactPage() {
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
    console.error('[contact] prisma query failed:', e);
  }
  return <PageContent title={title} content={content} updatedAt={updatedAt} />;
}
