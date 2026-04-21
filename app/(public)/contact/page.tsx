import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: '문의하기',
  description: `${SITE_NAME} 이용 중 궁금한 점이나 오류, 개선 의견이 있다면 알려주세요.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@govmate.co.kr';

  return (
    <article className="prose prose-sm px-4 py-6 sm:prose-base">
      <h1>문의하기</h1>

      <p>
        {SITE_NAME} 이용 중 궁금한 점, 정보 오류, 개선 의견 등 어떤 피드백도 환영합니다. 아래
        이메일로 연락해 주시면 최대한 빠르게 답변드리겠습니다.
      </p>

      <h2>이메일</h2>
      <p>
        <a href={`mailto:${email}`} rel="nofollow" className="underline">
          {email}
        </a>
      </p>

      <h2>포함해 주시면 좋은 정보</h2>
      <ul>
        <li>발생한 페이지의 URL</li>
        <li>기기/브라우저 (모바일 Chrome, PC Edge 등)</li>
        <li>오류 상황 스크린샷 또는 정확한 오류 메시지</li>
        <li>정책 정보 오류 제보 시: 정확한 정책명과 소관 기관</li>
      </ul>

      <h2>운영사 정보</h2>
      <ul>
        <li>운영사: 블루엣지</li>
        <li>주소: 충청남도 천안시 동남구 청수9로 47, 5층 535호</li>
      </ul>

      <p className="text-xs text-gray-400">
        본 서비스는 공식 정부 기관이 아닙니다. 신청·지급 관련 문의는 각 소관 기관에 해 주세요.
      </p>
    </article>
  );
}
