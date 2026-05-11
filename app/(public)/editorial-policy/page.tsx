import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/env';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'adenly659@gmail.com';

export const metadata: Metadata = {
  title: `편집 원칙 | ${SITE_NAME}`,
  description: `${SITE_NAME}의 복지 정책 정보 수집, 검수, 수정 요청 처리 기준을 안내합니다.`,
  alternates: { canonical: '/editorial-policy' },
  robots: { index: true, follow: true },
};

export default function EditorialPolicyPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-8 sm:prose-base">
      <h1>편집 원칙</h1>
      <p>
        {SITE_NAME}는 정부지원금과 복지 제도를 찾는 사용자가 공식 신청 전 필요한 정보를 빠르게 비교할 수 있도록
        공개 자료를 정리하는 민간 정보 서비스입니다. 모든 문서는 실제 신청 판단의 보조 자료이며, 최종 자격과 지급
        여부는 각 담당 기관의 공식 안내를 기준으로 합니다.
      </p>

      <h2>1. 정보 출처</h2>
      <p>정책 정보는 아래 출처를 우선 확인해 정리합니다.</p>
      <ul>
        <li>정부24, 보조금24, 복지로, 공공데이터포털</li>
        <li>중앙부처, 지방자치단체, 공공기관의 공고문과 보도자료</li>
        <li>신청 접수처, 조례, 사업 안내문 등 공식성이 확인되는 자료</li>
      </ul>

      <h2>2. 발행 기준</h2>
      <p>색인과 검색 노출 대상 문서는 아래 조건을 충족하도록 관리합니다.</p>
      <ul>
        <li>지원 대상, 신청 방법, 접수 기간, 필요 서류 중 핵심 항목을 명시합니다.</li>
        <li>공식 신청 또는 안내 URL을 확인 가능한 경우 함께 표시합니다.</li>
        <li>단순 복사 문구가 아니라 사용자가 판단하기 쉬운 요약과 주의사항을 덧붙입니다.</li>
        <li>내용이 짧거나 출처가 부족한 문서는 보강 전까지 검색 색인과 sitemap에서 제외합니다.</li>
      </ul>

      <h2>3. 업데이트와 검수</h2>
      <p>
        정책 페이지는 수집 시점과 수정 시점을 기준으로 마지막 확인일을 표시합니다. 접수 기간, 예산 소진, 자격 요건은
        수시로 바뀔 수 있으므로 중요한 신청 전에는 반드시 공식 페이지를 다시 확인해야 합니다.
      </p>

      <h2>4. 자동화와 사람 검수</h2>
      <p>
        일부 초안 작성, 분류, 요약에는 자동화 도구가 활용될 수 있습니다. 다만 공개 페이지는 출처, 신청 방법, 사용자
        오해 가능성을 기준으로 보강하며, 오류가 확인되면 수정 또는 비공개 처리합니다.
      </p>

      <h2>5. 오류 제보와 정정 요청</h2>
      <p>
        잘못된 정책 정보, 만료된 링크, 지역별 조건 누락을 발견했다면 아래 이메일로 알려 주세요. 제보에는 페이지 URL,
        문제가 되는 문장, 확인 가능한 공식 출처를 함께 보내 주시면 더 빠르게 검토할 수 있습니다.
      </p>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} rel="nofollow" className="underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </article>
  );
}
