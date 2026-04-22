import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: `${SITE_NAME}의 개인정보 수집·이용 및 보호에 관한 방침입니다.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const service = SITE_NAME || '복지길잡이';

  return (
    <article className="prose prose-sm px-4 py-6 sm:prose-base">
      <h1>개인정보처리방침</h1>

      <p className="text-xs text-gray-500">
        최종 업데이트: 2026-04-21 · 운영사: 블루엣지(충청남도 천안시 동남구 청수9로 47, 5층
        535호)
      </p>

      <h2>1. 처리 목적</h2>
      <p>{service}(이하 "서비스")는 아래 목적을 위해 최소한의 정보를 수집·이용합니다.</p>
      <ul>
        <li>서비스 제공 및 이용 통계 분석 (익명 기준)</li>
        <li>부정 이용 방지 및 시스템 안정성 확보</li>
        <li>회원 가입·로그인 기능 사용 시 계정 식별</li>
        <li>문의 응대</li>
      </ul>

      <h2>2. 수집 항목</h2>
      <ul>
        <li>
          <strong>비로그인 이용자</strong>: IP 주소, 기기/브라우저 정보, 접속 로그, 쿠키(필수)
        </li>
        <li>
          <strong>회원(소셜 로그인 이용 시)</strong>: 이메일, 이름 또는 닉네임, 프로필 이미지
          (제공 소셜 서비스가 반환하는 범위)
        </li>
        <li>
          <strong>문의 이용 시</strong>: 이메일 주소 및 문의 내용
        </li>
      </ul>

      <h2>3. 보유 및 이용 기간</h2>
      <ul>
        <li>접속 로그: 최대 3개월</li>
        <li>회원 정보: 회원 탈퇴 시 지체 없이 파기(관련 법령상 의무 보관 기간 제외)</li>
        <li>문의 이력: 수신 후 1년 이내 파기</li>
      </ul>

      <h2>4. 제3자 제공 및 위탁</h2>
      <p>
        서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래 범위에서만
        위탁·사용합니다.
      </p>
      <ul>
        <li>호스팅: Vercel (서비스 제공)</li>
        <li>데이터베이스: Supabase (데이터 저장)</li>
        <li>분석: Google Analytics 4 (익명 방문 통계)</li>
        <li>광고(활성 시): Google AdSense (맞춤 광고 제공, 브라우저 설정으로 거부 가능)</li>
      </ul>

      <h2>5. 쿠키</h2>
      <p>
        서비스는 필수 기능을 위한 쿠키와 분석용 쿠키를 사용합니다. 쿠키는 브라우저 설정에서
        거부할 수 있으나, 일부 기능이 제한될 수 있습니다.
      </p>

      <h2>6. 이용자의 권리</h2>
      <p>
        이용자는 언제든 자신의 개인정보 열람, 수정, 삭제, 처리정지를 요청할 수 있으며, 아래
        연락처로 요청 시 지체 없이 조치합니다.
      </p>

      <h2>7. 개인정보 보호 담당</h2>
      <ul>
        <li>담당부서: 블루엣지 운영팀</li>
        <li>
          이메일:{' '}
          <a href="mailto:contact@govmate.co.kr" rel="nofollow" className="underline">
            contact@govmate.co.kr
          </a>
        </li>
      </ul>

      <h2>8. 방침의 변경</h2>
      <p>
        본 방침은 법령, 서비스 변경에 따라 개정될 수 있으며, 변경 시 사이트 공지를 통해
        안내합니다.
      </p>
    </article>
  );
}
