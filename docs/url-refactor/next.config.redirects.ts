/**
 * next.config.js 용 redirects() 헬퍼
 * ------------------------------------------------------------------
 * 사용 예:
 *   // next.config.js
 *   const { welfareRedirects } = require('./lib/welfare-redirects');
 *   module.exports = {
 *     async redirects() {
 *       return welfareRedirects();
 *     },
 *   };
 *
 * 두 가지 리다이렉트를 반환:
 *  1) /welfare (목록 페이지) → /policies 또는 홈으로
 *  2) /welfare/:slug (동적 상세)는 여기서 처리할 수 없으므로 middleware로 처리
 *     (DB 룩업이 필요하기 때문)
 *
 * 추가로 기존에 잘못 생성됐을 수 있는 몇몇 패턴을 명시적으로 차단/이동.
 */

export type RedirectRule = {
  source: string;
  destination: string;
  permanent: boolean; // true = 301
};

export function welfareRedirects(): RedirectRule[] {
  return [
    // /welfare 또는 /welfare/ → 전체 정책 목록
    { source: '/welfare', destination: '/policies', permanent: true },
    { source: '/welfare/', destination: '/policies', permanent: true },

    // 일부 구버전에서 사용했을 수 있는 경로 (있다면)
    { source: '/policy/:slug', destination: '/policies/:slug', permanent: true },

    // 구 카테고리 alias (예전 문서에서 쓰인 흔적 정리)
    { source: '/bokji', destination: '/', permanent: true },
    { source: '/bokji/:slug', destination: '/policies/:slug', permanent: true },

    // trailing slash 통일 (옵션)
    // { source: '/:path+/', destination: '/:path+', permanent: true },
  ];
}
