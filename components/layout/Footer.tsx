import Link from 'next/link';
import { prisma } from '@/lib/prisma';

/**
 * 푸터 설정 (SiteSetting.key = "footer" 에 저장되는 JSON)
 * admin 에서 수정 가능. DB 에 행이 없으면 DEFAULT_FOOTER 사용.
 */
export interface FooterSettings {
  companyName: string;
  email: string;
  slogan: string;
  disclosures: string[];
  copyrightYear: number;
}

export const DEFAULT_FOOTER: FooterSettings = {
  companyName: '블루엣지',
  email: 'adenly659@gmail.com',
  slogan: '정부 복지 정책을 통합 검색·추천하는 민간 정보 서비스',
  disclosures: [
    '본 사이트는 정부 공식 사이트가 아닌 민간 정보 서비스이며, 정보는 공공데이터포털 등 공공 데이터를 기반으로 제공됩니다.',
    '정확한 내용은 소관 부처·지자체에 확인해 주시기 바랍니다.',
    '본 사이트에는 광고 및 제휴 마케팅 링크가 포함될 수 있으며, 이를 통해 수익이 발생할 수 있습니다.',
  ],
  copyrightYear: new Date().getFullYear(),
};

async function getFooterSettings(): Promise<FooterSettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'footer' } });
    if (row?.value && typeof row.value === 'object' && !Array.isArray(row.value)) {
      const v = row.value as Partial<FooterSettings>;
      return {
        companyName: v.companyName ?? DEFAULT_FOOTER.companyName,
        email: v.email ?? DEFAULT_FOOTER.email,
        slogan: v.slogan ?? DEFAULT_FOOTER.slogan,
        disclosures: Array.isArray(v.disclosures) && v.disclosures.length
          ? v.disclosures.map(String)
          : DEFAULT_FOOTER.disclosures,
        copyrightYear: Number(v.copyrightYear) || DEFAULT_FOOTER.copyrightYear,
      };
    }
  } catch (e) {
    console.error('[Footer] getFooterSettings failed:', e);
  }
  return DEFAULT_FOOTER;
}

// 1시간마다 재생성 (admin 수정이 바로 반영되지는 않지만 DB 부하 감소)
export const revalidate = 3600;

export default async function Footer() {
  const s = await getFooterSettings();
  return (
    <footer className="bg-white border-t border-gray-200 mt-8 pb-20 md:pb-6">
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm text-gray-600">
        {/* 브랜드 블록 */}
        <div className="mb-6">
          <div className="text-base font-semibold text-gray-900 mb-1.5">
            지원금길잡이
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">{s.slogan}</div>
        </div>

        {/* 링크 그리드 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs font-semibold text-gray-900 mb-2.5">
              약관·소개
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-green-600 transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-600 hover:text-green-600 transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/marketing-consent" className="text-gray-600 hover:text-green-600 transition-colors">
                  마케팅 수신 동의
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-green-600 transition-colors">
                  서비스 소개
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-green-600 transition-colors">
                  문의하기
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-900 mb-2.5">
              서비스 이용
            </div>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/welfare/search" className="text-gray-600 hover:text-green-600 transition-colors">
                  복지 검색
                </Link>
              </li>
              <li>
                <Link href="/recommend" className="text-gray-600 hover:text-green-600 transition-colors">
                  맞춤 추천
                </Link>
              </li>
              <li>
                <Link href="/welfare/categories" className="text-gray-600 hover:text-green-600 transition-colors">
                  카테고리
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-600 hover:text-green-600 transition-colors">
                  홈
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 책임 고지 */}
        <div className="border-t border-gray-100 pt-4 mb-4 space-y-2 text-[11px] text-gray-500 leading-relaxed">
          {s.disclosures.map((d, i) => (
            <p key={i}>■ {d}</p>
          ))}
        </div>

        {/* 운영자 + 저작권 */}
        <div className="border-t border-gray-100 pt-4 text-[11px] text-gray-400 leading-relaxed">
          <div>
            운영자: {s.companyName} · 문의:{' '}
            <a
              href={`mailto:${s.email}`}
              className="underline hover:text-green-600 transition-colors"
            >
              {s.email}
            </a>
          </div>
          <div className="mt-1">
            © {s.copyrightYear} {s.companyName} All Rights Reserved
          </div>
        </div>
      </div>
    </footer>
  );
}
