import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PageContent from '@/components/PageContent';

const SLUG = 'privacy-policy';

const DEFAULT_TITLE = '개인정보처리방침';
const DEFAULT_CONTENT = `블루엣지(이하 "회사")는 복지길잡이(www.govmate.co.kr, 이하 "서비스")를 운영하면서 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관련 법령을 준수합니다.

## 1. 수집하는 개인정보 항목

회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집할 수 있습니다.

- 선택 수집: 이메일 주소, 기기 식별 정보, 푸시 알림 토큰 (알림 수신 동의 시)
- 자동 수집: 접속 IP, 브라우저/OS 정보, 접속 시각, 이용 기록, 쿠키

## 2. 개인정보의 수집 및 이용 목적

- 복지 정보 검색·추천 서비스 제공
- 신규 복지 정책 알림 발송 (이용자 동의 시)
- 서비스 품질 향상 및 통계 분석
- 부정 이용 방지 및 서비스 보안

## 3. 개인정보의 보유 및 이용 기간

회사는 이용자가 알림 해지를 요청하거나 서비스 이용을 종료한 경우, 수집된 개인정보를 지체 없이 파기합니다. 다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 안전하게 분리 보관합니다.

## 4. 개인정보의 제3자 제공

회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 이용자의 사전 동의가 있거나 법령에 근거한 경우에는 예외로 합니다.

## 5. 개인정보의 처리 위탁

회사는 서비스 운영을 위해 다음과 같은 외부 업체에 개인정보 처리를 위탁할 수 있습니다.

- 클라우드 호스팅: Vercel Inc., Supabase Inc.
- 푸시 알림 서비스: Google Firebase (FCM)
- 사용자 분석: Google Analytics, Naver Search Advisor
- 소셜 로그인: Kakao Corp.

## 6. 쿠키 및 광고 기술

본 서비스는 이용자 경험 개선과 맞춤형 광고 제공을 위해 쿠키 및 유사 기술을 사용할 수 있습니다. 또한 제3자 광고 파트너(Google AdSense 등)가 이용자의 관심사에 기반한 광고를 게재할 수 있으며, 이 과정에서 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.

Google AdSense 를 포함한 제3자 공급업체의 광고 맞춤설정 해지는 Google 광고 설정 페이지(https://adssettings.google.com)에서 가능합니다.

## 7. 이용자의 권리

이용자는 언제든지 개인정보의 열람, 수정, 삭제를 요청할 수 있으며, 알림 수신 동의 철회 또한 요청할 수 있습니다. 요청은 하단 이메일로 접수해 주시기 바랍니다.

## 8. 개인정보 보호책임자

- 성명: 블루엣지 개인정보 담당자
- 이메일: adenly659@gmail.com

## 9. 방침의 변경

본 개인정보처리방침은 법령 또는 서비스 정책의 변경에 따라 수정될 수 있으며, 변경 시 본 페이지에 공지합니다.

시행일: 2026년 4월 20일`;

export const metadata: Metadata = {
  title: '개인정보처리방침 | 복지길잡이',
  description:
    '복지길잡이의 개인정보 수집·이용·보관 및 이용자의 권리에 대한 안내입니다.',
  alternates: { canonical: 'https://www.govmate.co.kr/privacy-policy' },
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function PrivacyPolicyPage() {
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
    console.error('[privacy-policy] prisma query failed:', e);
  }
  return <PageContent title={title} content={content} updatedAt={updatedAt} />;
}
