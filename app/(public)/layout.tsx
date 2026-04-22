/**
 * Public route group layout
 * ----------------------------------------------------------------
 * 루트(app/layout.tsx)에서 이미 AppSmartBanner / MobileHeader / Footer /
 * BottomNav / ChannelTalk 를 렌더링하고 max-w-3xl 래퍼까지 씌우고 있으므로,
 * 이 파일은 중복 렌더를 방지하기 위해 단순 pass-through 로만 둔다.
 *
 * 이전: 이 layout 도 동일 컴포넌트들을 다시 render → 헤더/푸터 2중 노출
 * 수정: pass-through 로 전환 (2026-04-22 bug fix)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
