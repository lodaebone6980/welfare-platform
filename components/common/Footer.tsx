import Link from 'next/link';
import { SITE_NAME } from '@/lib/env';

/**
 * 공통 Footer — 모든 공개 페이지에 사용
 * - 서비스/운영사 정보(블루엣지)
 * - 주소, 문의
 * - 이용약관 · 개인정보처리방침
 * - 자료 출처(공공누리 1유형)
 *
 * 외부 링크는 모두 rel="nofollow" + 같은 창(요청 사항).
 */
export default function Footer() {
  const year = new Date().getFullYear();

  const service = SITE_NAME || '복지길잡이';
  const company = '블루엣지';
  const address = '충청남도 천안시 동남구 청수9로 47, 5층 535호';
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'adenly659@gmail.com';
  const bizNo = process.env.NEXT_PUBLIC_BIZ_NO || '618-37-93965';
  const representative = process.env.NEXT_PUBLIC_REPRESENTATIVE || '이재호';

  return (
    <footer
      className="mt-10 border-t border-gray-200 bg-gray-50 pb-24"
      /* pb-24: 모바일 하단 BottomNav에 가리지 않도록 */
    >
      <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-gray-600">
        {/* 상단 네비 */}
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <Link href="/about" className="hover:text-gray-900">
            서비스 소개
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/contact" className="hover:text-gray-900">
            문의
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/terms" className="hover:text-gray-900">
            이용약관
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/privacy" className="font-semibold text-gray-900 hover:underline">
            개인정보처리방침
          </Link>
        </nav>

        {/* 사업자 정보 — | 구분자 인라인 포맷 */}
        <div className="mt-4 text-xs leading-relaxed text-gray-700">
          <div className="font-semibold text-gray-900 mb-1">{service} · {company}</div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-gray-600">
            <span>
              <span className="text-gray-500">문의</span>{' '}
              <a href={`mailto:${email}`} rel="nofollow" className="hover:underline text-gray-800">
                {email}
              </a>
            </span>
            {representative && (
              <>
                <span className="text-gray-300">|</span>
                <span>
                  <span className="text-gray-500">대표</span>{' '}
                  <span className="text-gray-800">{representative}</span>
                </span>
              </>
            )}
            {bizNo && (
              <>
                <span className="text-gray-300">|</span>
                <span>
                  <span className="text-gray-500">사업자등록번호</span>{' '}
                  <span className="text-gray-800">{bizNo}</span>
                </span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span>
              <span className="text-gray-500">주소</span>{' '}
              <span className="text-gray-800">{address}</span>
            </span>
          </div>
        </div>

        {/* 출처/면책 */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-gray-500">
          <p>
            본 사이트의 정책 정보는{' '}
            <a href="https://www.gov.kr" rel="nofollow noopener" className="underline">
              정부24
            </a>
            ,{' '}
            <a
              href="https://www.bokjiro.go.kr"
              rel="nofollow noopener"
              className="underline"
            >
              복지로
            </a>
            , 공공데이터포털(data.go.kr) 및 각 부처 보도자료(공공누리 1유형)를 재가공해
            제공합니다. 최종 신청·지급 여부 및 금액은 각 소관 기관의 공식 안내를 확인해 주세요.
          </p>
          <p className="mt-1">
            본 서비스는 공식 정부 기관이 아니며, 정보 제공 및 안내 목적의 민간 서비스입니다.
          </p>
        </div>

        {/* 저작권 */}
        <p className="mt-3 text-[11px] text-gray-400">
          © {year} {company}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
