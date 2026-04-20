import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import PageContent from '@/components/PageContent';

const SLUG = 'terms';

const DEFAULT_TITLE = '이용약관';
const DEFAULT_CONTENT = `본 약관은 블루엣지(이하 "회사")가 제공하는 복지길잡이(www.govmate.co.kr, 이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

## 제1조 (목적)

이 약관은 회사가 제공하는 복지길잡이 서비스의 이용 조건, 절차, 회사와 이용자의 권리·의무·책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.

## 제2조 (용어의 정의)

- "서비스"란 회사가 제공하는 www.govmate.co.kr 및 관련 모든 웹/모바일 서비스를 말합니다.
- "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.
- "콘텐츠"란 서비스 내에서 제공되는 복지 정책 정보, 추천 결과, 이미지, 텍스트 등 일체의 자료를 말합니다.

## 제3조 (약관의 효력 및 변경)

본 약관은 서비스 화면에 공지함으로써 효력이 발생합니다. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 변경 사항을 사전 공지합니다.

## 제4조 (서비스의 내용)

회사는 다음과 같은 서비스를 제공합니다.

- 정부 복지 정책 통합 검색
- 이용자 조건 기반 맞춤 추천
- 카테고리/지역별 복지 정보 탐색
- 신규 정책 알림 발송
- 기타 회사가 추가 개발하는 부가 서비스

## 제5조 (서비스의 중단)

회사는 시스템 점검, 교체, 고장, 통신 두절 등 불가피한 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다. 이 경우 회사는 사전 또는 사후에 이용자에게 공지합니다.

## 제6조 (이용자의 의무)

이용자는 다음 행위를 하여서는 안 됩니다.

- 타인의 개인정보 도용
- 서비스의 안정적인 운영을 방해하는 행위
- 서비스에 게시된 정보를 무단 복제·배포·상업적 이용하는 행위
- 자동화된 수단으로 서비스를 대량 이용하거나 서버에 부담을 주는 행위
- 기타 관련 법령 및 공서양속에 반하는 행위

## 제7조 (정보의 정확성 및 책임 제한)

서비스에서 제공하는 복지 정책 정보는 공공데이터포털 등 공공 데이터를 기반으로 수집·가공된 민간 정보이며, 회사는 정보의 정확성·완전성·최신성을 보장하지 않습니다. 실제 신청·수혜 가능 여부는 소관 부처 및 지자체의 공식 안내를 반드시 확인하시기 바랍니다.

본 서비스의 정보만을 신뢰하여 발생한 손해에 대해서는 회사가 책임을 지지 않습니다.

## 제8조 (광고 및 제휴 링크)

본 서비스에는 Google AdSense 등 제3자 광고가 게재되거나 제휴 마케팅 링크가 포함될 수 있으며, 이용자가 광고·제휴 링크를 통해 구매·가입을 진행하는 경우 회사가 수수료를 받을 수 있습니다. 광고·제휴 링크를 통한 거래의 내용·조건·품질은 해당 광고주 또는 제휴사에 있으며, 회사는 이에 대한 책임을 지지 않습니다.

## 제9조 (저작권)

서비스에 포함된 콘텐츠의 저작권은 회사 또는 원저작자(공공기관 등)에게 있습니다. 이용자는 회사의 사전 동의 없이 서비스의 콘텐츠를 영리 목적으로 복제·배포·전송·출판할 수 없습니다.

## 제10조 (분쟁 해결 및 관할)

본 서비스 이용과 관련된 분쟁은 회사와 이용자 간 성실한 협의로 해결함을 원칙으로 하며, 협의가 이루어지지 않을 경우 대한민국 법령을 준거법으로 하고 민사소송법상 관할 법원에 제소합니다.

## 부칙

본 약관은 2026년 4월 20일부터 시행합니다.`;

export const metadata: Metadata = {
  title: '이용약관 | 복지길잡이',
  description:
    '복지길잡이 서비스 이용에 관한 권리·의무·책임사항 및 광고·제휴 링크 관련 안내입니다.',
  alternates: { canonical: 'https://www.govmate.co.kr/terms' },
  robots: { index: true, follow: true },
};

export const revalidate = 3600;

export default async function TermsPage() {
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
    console.error('[terms] prisma query failed:', e);
  }
  return <PageContent title={title} content={content} updatedAt={updatedAt} />;
}
