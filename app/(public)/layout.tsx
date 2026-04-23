/**
 * Public route group layout
 * ----------------------------------------------------------------
 * 루트(app/layout.tsx)에서 AppSmartBanner / MobileHeader / Footer /
 * BottomNav / ChannelTalk 를 렌더링한다. 컨테이너 폭은 루트에서 고정하지
 * 않고 route group 별로 제한한다.
 *
 * - (public): 모바일 우선 레이아웃이므로 max-w-3xl(=768px) 로 제한
 * - (admin):  데스크톱 대시보드이므로 각 페이지에서 max-w-[1600px] 사용
 *
 * 2026-04-23: 루트의 max-w-3xl 전역 래퍼를 제거하고 이 파일로 이동.
 *             이전에는 admin 페이지도 768px 로 잘려 모바일처럼 보이는 문제가 있었음.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-3xl mx-auto">{children}</div>;
}
