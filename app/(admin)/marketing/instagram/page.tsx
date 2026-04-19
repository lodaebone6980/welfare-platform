import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="인스타그램"
      icon="📷"
      description="인스타그램 피드 · 릴스 · 스토리를 관리합니다."
      features={[
        "정책을 카드뉴스 · 릴스 스크립트로 자동 변환",
        "예약 발행 · 다중 계정 관리",
        "해시태그 · 멘션 추천",
        "게시물별 인사이트(도달 · 저장 · 공유) 집계",
        "DM · 댓글 알림 통합 관리",
      ]}
    />
  );
}
