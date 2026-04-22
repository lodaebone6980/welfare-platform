import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: '서비스 소개',
  description: `${SITE_NAME}는 정부·지자체의 복지 정보를 한곳에 모아 쉽게 찾을 수 있도록 돕는 안내 서비스입니다.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article className="prose prose-sm px-4 py-6 sm:prose-base">
      <h1>서비스 소개</h1>

      <p>
        {SITE_NAME}는 흩어져 있는 정부·지자체·공공기관의 복지 정보를 한 곳에서 빠르게 찾을 수
        있도록 모아 둔 안내 서비스입니다. 정부24, 복지로, 공공데이터포털에 공개된 정보를
        재가공해 누구나 이해하기 쉬운 형태로 정리합니다.
      </p>

      <h2>무엇을 돕나요</h2>
      <p>
        지원금·환급금·바우처·보조금·수당 등 실질적으로 받을 수 있는 제도를 카테고리별로 모으고,
        자격 요건과 신청 방법을 간결하게 요약합니다. 또한 뉴스·정책 동향을 상시 모니터링해 새로
        발표되는 지원 제도를 빠르게 반영합니다.
      </p>

      <h2>운영사</h2>
      <p>
        본 서비스는 <strong>블루엣지</strong>가 운영합니다.
      </p>
      <ul>
        <li>대표: 이재호</li>
        <li>사업자등록번호: 618-37-93965</li>
        <li>주소: 충청남도 천안시 동남구 청수9로 47, 5층 535호</li>
        <li>문의: adenly659@gmail.com</li>
      </ul>

      <h2>정보 출처와 면책</h2>
      <p>
        본 사이트는 <strong>공식 정부 기관이 아닙니다.</strong> 모든 안내는 정보 제공 목적이며,
        최종 자격·지급 여부는 반드시 소관 기관의 공식 안내를 통해 확인해 주세요. 자료는 정부24,
        복지로, data.go.kr, 각 부처 보도자료(공공누리 제1유형)를 근거로 합니다.
      </p>

      <p className="text-xs text-gray-400">
        서비스명과 디자인은 이용자 편의를 위한 것이며, 정부 로고·표장과는 무관합니다.
      </p>
    </article>
  );
}
