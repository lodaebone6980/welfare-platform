import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/env';

export const metadata: Metadata = {
  title: '이용약관',
  description: `${SITE_NAME} 서비스 이용약관입니다.`,
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: false },
};

export default function TermsPage() {
  const service = SITE_NAME || '지원금길잡이';
  return (
    <article className="prose prose-sm px-4 py-6 sm:prose-base">
      <h1>이용약관</h1>

      <p className="text-xs text-gray-500">
        최종 업데이트: 2026-04-21 · 운영사: 블루엣지 · 본 서비스는 공식 정부 기관이 아닙니다.
      </p>

      <h2>제1조 (목적)</h2>
      <p>
        이 약관은 {service}(이하 "서비스")가 제공하는 정부·지자체 복지 정보 안내 서비스 이용과
        관련하여 회원 또는 이용자와 운영사(블루엣지) 사이의 권리, 의무, 책임사항을 규정함을
        목적으로 합니다.
      </p>

      <h2>제2조 (정의)</h2>
      <ul>
        <li>"서비스"란 본 사이트 및 그 관련 기능 일체를 말합니다.</li>
        <li>
          "이용자"란 본 서비스에 접속하여 정보를 열람하거나 기능을 사용하는 모든 사람을
          말합니다.
        </li>
      </ul>

      <h2>제3조 (서비스의 성격)</h2>
      <p>
        본 서비스는 정부24, 복지로, 공공데이터포털(data.go.kr), 각 부처 보도자료(공공누리
        제1유형) 등 공개된 공공 정보를 재가공하여 제공하는 <strong>민간 안내 서비스</strong>이며,
        정부·지자체의 공식 사이트가 아닙니다. 최종 자격, 신청 방법, 지급 금액은 반드시 소관
        기관의 공식 안내를 통해 확인해야 합니다.
      </p>

      <h2>제4조 (이용자의 의무)</h2>
      <ul>
        <li>본 서비스의 콘텐츠를 무단 복제·배포·상업적 이용하지 않습니다.</li>
        <li>
          자동화된 수단으로 과도한 요청을 보내거나 시스템에 부하를 주는 행위를 하지 않습니다.
        </li>
        <li>타인의 권리를 침해하거나 관련 법령을 위반하는 용도로 사용하지 않습니다.</li>
      </ul>

      <h2>제5조 (면책)</h2>
      <p>
        운영사는 정보의 정확성을 유지하기 위해 노력하지만, 정부 정책·예산·접수 기간 등은 수시로
        변동될 수 있어 <strong>정보의 최신성 및 완전성을 보장하지 않습니다.</strong> 본 서비스의
        정보에 기반한 결정으로 발생한 손해에 대해 운영사는 책임을 지지 않습니다.
      </p>

      <h2>제6조 (지식재산권)</h2>
      <p>
        본 서비스의 자체 제작 텍스트·요약·UI·디자인에 관한 지식재산권은 운영사에 있습니다.
        공공데이터를 기반으로 한 부분은 각 공공누리 이용 조건을 따릅니다.
      </p>

      <h2>제7조 (약관의 개정)</h2>
      <p>
        운영사는 필요한 경우 약관을 개정할 수 있으며, 개정 시 사이트 공지를 통해 안내합니다.
      </p>

      <h2>제8조 (관할 및 준거법)</h2>
      <p>본 약관은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 민사소송법상 관할 법원을 따릅니다.</p>

      <p className="mt-8 text-xs text-gray-400">
        문의: <a href="mailto:contact@govmate.co.kr" rel="nofollow" className="underline">contact@govmate.co.kr</a>
      </p>
    </article>
  );
}
