import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PageContent from '@/components/PageContent';

const SLUG = 'marketing-consent';

const DEFAULT_TITLE = '마케팅 정보 수신 동의';
const DEFAULT_CONTENT = `블루엣지(이하 "회사")는 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 제50조 및 「개인정보 보호법」에 따라 이용자로부터 광고성 정보 수신에 대한 사전 동의를 받고 있습니다. 본 동의는 선택 사항이며, 동의하지 않더라도 복지길잡이(www.govmate.co.kr, 이하 "서비스")의 기본 이용에는 제한이 없습니다.

## 1. 수집 및 이용 목적

- 신규 복지 정책·지원금 소식 안내
- 관심 카테고리·지역 기반 맞춤 혜택 알림
- 서비스 업데이트, 이벤트 및 기획 기사 안내
- 이용자 참여형 콘텐츠(설문, 베타 기능) 초대

## 2. 수집하는 정보 항목

- 이메일 주소
- 푸시 알림 토큰 및 기기 식별 정보
- 휴대전화 번호 (문자 수신 동의 시에 한함)
- 관심 카테고리, 지역 코드 등 알림 설정 정보

## 3. 전송 수단

마케팅 정보는 다음 중 이용자가 선택한 수단으로만 발송됩니다.

- 이메일 (뉴스레터, 기획 기사, 추천 지원금)
- 웹/앱 푸시 알림
- 문자(SMS/LMS) — 별도 동의 시에만 발송

## 4. 보유 및 이용 기간

- 수신 동의일로부터 동의 철회 시점까지
- 동의 철회 또는 회원 탈퇴 시 즉시 파기
- 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 분리 보관

## 5. 수신 동의 철회 방법

이용자는 언제든지 마케팅 정보 수신 동의를 철회할 수 있으며, 철회 즉시 해당 수단으로의 발송이 중단됩니다.

- 마이페이지 > 알림 설정에서 직접 해지
- 이메일 하단의 "수신 거부" 링크 클릭
- 개인정보 보호책임자 이메일로 요청 (adenly659@gmail.com)
- 푸시 알림은 기기 설정 또는 앱 내 알림 토글로 해제

## 6. 동의 거부 권리 및 불이익 안내

- 마케팅 정보 수신 동의는 선택 사항입니다.
- 동의하지 않아도 복지 정보 검색, 즐겨찾기 등 서비스 핵심 기능은 정상적으로 이용할 수 있습니다.
- 동의하지 않을 경우 신규 정책 알림, 맞춤 혜택 안내 등 일부 부가 서비스 제공이 제한될 수 있습니다.

## 7. 발신자 정보

- 서비스명: 복지길잡이 (www.govmate.co.kr)
- 운영사: 블루엣지
- 개인정보 보호책임자: adenly659@gmail.com

## 8. 동의의 변경

본 마케팅 수신 동의 내용은 관련 법령 또는 서비스 정책 변경에 따라 수정될 수 있으며, 변경 시 본 페이지에 공지하고 중요한 변경의 경우 별도의 통지 후 재동의를 요청합니다.

시행일: 2026년 4월 24일`;

export const metadata: Metadata = {
  title: '마케팅 정보 수신 동의 | 복지길잡이',
  description:
    '복지길잡이의 광고성 정보 수신 동의에 대한 수집 항목, 이용 목적, 보유 기간 및 철회 방법 안내입니다.',
  alternates: { canonical: 'https://www.govmate.co.kr/marketing-consent' },
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function MarketingConsentPage() {
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
    console.error('[marketing-consent] prisma query failed:', e);
  }
  return <PageContent title={title} content={content} updatedAt={updatedAt} />;
}
