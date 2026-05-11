import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/env';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'adenly659@gmail.com';
const COMPANY = '블루엣지';

export const metadata: Metadata = {
  title: `마케팅 정보 수신 동의 | ${SITE_NAME}`,
  description: `${SITE_NAME}의 마케팅 정보 수신 동의 항목, 발송 수단, 철회 방법을 안내합니다.`,
  alternates: { canonical: '/marketing' },
  robots: { index: true, follow: true },
};

export default function MarketingConsentPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-8 sm:prose-base">
      <h1>마케팅 정보 수신 동의</h1>
      <p className="text-xs text-gray-500">시행일: 2026년 5월 12일</p>

      <p>
        {COMPANY}는 {SITE_NAME}({SITE_URL}) 이용자에게 신규 복지정책, 지원금 정보, 서비스 업데이트,
        이벤트 및 광고성 정보를 제공하기 위해 아래와 같이 선택 동의를 받을 수 있습니다. 본 동의는 선택 사항이며,
        동의하지 않아도 기본적인 서비스 이용에는 제한이 없습니다.
      </p>

      <h2>1. 수집 및 이용 목적</h2>
      <ul>
        <li>신규 정부지원금, 복지정책, 보조금, 환급금 정보 안내</li>
        <li>이용자의 관심 카테고리와 지역에 맞춘 추천 콘텐츠 안내</li>
        <li>서비스 기능 업데이트, 이벤트, 설문, 제휴 혜택 안내</li>
        <li>광고성 정보 및 프로모션 안내</li>
      </ul>

      <h2>2. 수집 항목</h2>
      <ul>
        <li>이메일 주소</li>
        <li>푸시 알림 토큰 및 기기 식별 정보</li>
        <li>휴대전화번호 또는 문자 수신 정보가 별도로 제공되는 경우 해당 번호</li>
        <li>관심 카테고리, 지역, 알림 설정값, 서비스 이용 기록</li>
      </ul>

      <h2>3. 발송 수단</h2>
      <p>마케팅 정보는 이용자가 동의하거나 설정한 수단으로만 발송합니다.</p>
      <ul>
        <li>이메일</li>
        <li>웹 또는 앱 푸시 알림</li>
        <li>문자 메시지, 카카오 알림 등 별도 동의가 필요한 채널</li>
      </ul>

      <h2>4. 보유 및 이용 기간</h2>
      <p>
        마케팅 정보 수신 동의일로부터 동의 철회 또는 회원 탈퇴 시까지 보관·이용합니다. 관련 법령에 따라
        보관이 필요한 기록은 해당 기간 동안 분리 보관할 수 있습니다.
      </p>

      <h2>5. 동의 철회 방법</h2>
      <ul>
        <li>마이페이지 또는 알림 설정 화면에서 수신 동의를 해제</li>
        <li>이메일 하단의 수신 거부 링크 이용</li>
        <li>브라우저 또는 기기 설정에서 푸시 알림 차단</li>
        <li>
          개인정보 보호책임자 이메일{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} rel="nofollow" className="underline">
            {CONTACT_EMAIL}
          </a>
          로 철회 요청
        </li>
      </ul>

      <h2>6. 동의 거부 권리 및 불이익</h2>
      <p>
        이용자는 마케팅 정보 수신 동의를 거부하거나 언제든 철회할 수 있습니다. 동의하지 않아도 복지정책 검색,
        추천, 일반 콘텐츠 열람 등 기본 서비스 이용에는 제한이 없으며, 다만 신규 정책 알림이나 이벤트 안내 등
        일부 부가 안내를 받지 못할 수 있습니다.
      </p>

      <h2>7. 변경 안내</h2>
      <p>
        본 동의 내용이 변경되는 경우 변경 사항을 본 페이지에 공개하고, 중요한 변경은 서비스 화면 또는 별도 알림으로
        안내합니다.
      </p>
    </article>
  );
}
