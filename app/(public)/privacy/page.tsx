import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/env';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'adenly659@gmail.com';
const OPERATOR = process.env.NEXT_PUBLIC_REPRESENTATIVE || '이재호';
const COMPANY = '블루엣지';

export const metadata: Metadata = {
  title: `개인정보처리방침 | ${SITE_NAME}`,
  description: `${SITE_NAME}의 개인정보 수집, 이용, 보관, 위탁, 권리 행사 방법을 안내합니다.`,
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-3xl px-4 py-8 sm:prose-base">
      <h1>개인정보처리방침</h1>
      <p className="text-xs text-gray-500">시행일: 2026년 5월 12일</p>

      <p>
        {COMPANY}(대표 {OPERATOR}, 이하 “운영자”)는 {SITE_NAME}({SITE_URL}, 이하 “서비스”)를
        운영하면서 개인정보 보호법 등 관련 법령을 준수하고, 이용자의 개인정보를 안전하게 처리하기 위해
        다음과 같이 개인정보처리방침을 공개합니다.
      </p>

      <h2>1. 처리 목적 및 수집 항목</h2>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>목적</th>
            <th>수집 항목</th>
            <th>보유 기간</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>회원 가입 및 로그인</td>
            <td>본인 식별, 계정 관리, 부정 이용 방지</td>
            <td>이메일, 이름 또는 닉네임, 프로필 이미지, 소셜 로그인 식별자</td>
            <td>회원 탈퇴 시까지</td>
          </tr>
          <tr>
            <td>맞춤 정책 추천</td>
            <td>관심 조건에 맞는 복지·지원금 정보 제공</td>
            <td>지역, 연령대, 가구 형태, 소득 구간, 직업·학업 상태, 관심 카테고리 등 이용자가 입력한 조건</td>
            <td>서비스 제공 목적 달성 시 또는 회원 탈퇴 시까지</td>
          </tr>
          <tr>
            <td>알림 및 푸시</td>
            <td>신규 정책, 관심 정책, 일일 요약 알림 발송</td>
            <td>이메일 주소, 푸시 알림 토큰, 알림 설정값, 기기 정보</td>
            <td>알림 동의 철회 또는 회원 탈퇴 시까지</td>
          </tr>
          <tr>
            <td>문의 처리</td>
            <td>문의 확인, 답변, 오류 신고 처리</td>
            <td>이메일 주소, 문의 내용, 첨부 정보</td>
            <td>처리 완료 후 3년 이내</td>
          </tr>
          <tr>
            <td>서비스 이용 기록</td>
            <td>보안, 장애 대응, 통계 분석, 품질 개선</td>
            <td>IP 주소, 접속 일시, 방문 URL, 리퍼러, 브라우저·OS 정보, 쿠키, 광고 클릭 식별자</td>
            <td>최대 3개월 또는 통계화 후 보관</td>
          </tr>
        </tbody>
      </table>

      <h2>2. 자동 수집 정보와 쿠키</h2>
      <p>
        서비스 이용 과정에서 접속 로그, 쿠키, 기기 정보, 방문 기록이 자동으로 생성되어 수집될 수 있습니다.
        쿠키는 로그인 유지, 보안, 이용 통계, 맞춤형 콘텐츠와 광고 제공을 위해 사용됩니다. 이용자는 브라우저
        설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 기능 이용이 제한될 수 있습니다.
      </p>

      <h2>3. 개인정보의 제3자 제공</h2>
      <p>
        운영자는 이용자의 개인정보를 본 방침에 명시한 목적 범위 내에서만 처리하며, 이용자의 동의가 있거나
        법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.
      </p>

      <h2>4. 개인정보 처리 위탁</h2>
      <p>서비스 운영을 위해 다음 외부 서비스를 사용할 수 있습니다.</p>
      <ul>
        <li>Vercel: 웹사이트 호스팅 및 배포</li>
        <li>Supabase 또는 PostgreSQL 호스팅 사업자: 데이터베이스 보관</li>
        <li>Kakao, Google: 소셜 로그인 인증</li>
        <li>Google Firebase Cloud Messaging: 푸시 알림 발송</li>
        <li>Google Analytics, Search Console, Naver Search Advisor: 방문 통계 및 검색 품질 분석</li>
        <li>Google AdSense: 광고 제공 및 광고 성과 측정</li>
        <li>Cloudflare R2 또는 S3 호환 저장소: 이미지 파일 보관</li>
      </ul>
      <p>
        위탁 업무의 내용이나 수탁자가 변경되는 경우 본 방침을 통해 공개합니다.
      </p>

      <h2>5. 파기 절차 및 방법</h2>
      <p>
        개인정보는 보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다. 전자 파일은 복구하기 어렵도록
        삭제하고, 별도 법령에 따라 보관이 필요한 정보는 분리하여 보관합니다.
      </p>

      <h2>6. 안전성 확보 조치</h2>
      <ul>
        <li>관리자 권한 제한 및 인증 절차 적용</li>
        <li>비밀번호, 토큰, API 키 등 비밀정보의 환경변수 분리</li>
        <li>불필요한 개인정보 수집 최소화</li>
        <li>접속 기록 및 오류 기록을 통한 보안 점검</li>
      </ul>

      <h2>7. 이용자의 권리</h2>
      <p>
        이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요청할 수 있습니다.
        요청은 아래 연락처로 접수할 수 있으며, 운영자는 본인 확인 후 관련 법령에 따라 처리합니다.
      </p>

      <h2>8. 개인정보 보호책임자</h2>
      <ul>
        <li>책임자: {OPERATOR}</li>
        <li>운영자: {COMPANY}</li>
        <li>
          이메일:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} rel="nofollow" className="underline">
            {CONTACT_EMAIL}
          </a>
        </li>
      </ul>

      <h2>9. 권익침해 구제 방법</h2>
      <p>개인정보 침해에 대한 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
      <ul>
        <li>개인정보침해신고센터: 국번 없이 118, privacy.kisa.or.kr</li>
        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
        <li>대검찰청 사이버수사과: 국번 없이 1301, www.spo.go.kr</li>
        <li>경찰청 사이버수사국: 국번 없이 182, ecrm.police.go.kr</li>
      </ul>

      <h2>10. 방침 변경</h2>
      <p>
        본 개인정보처리방침은 법령, 서비스 내용, 수집 항목 변경에 따라 수정될 수 있습니다. 중요한 변경 사항은
        사이트 공지 또는 본 페이지를 통해 안내합니다.
      </p>
    </article>
  );
}
