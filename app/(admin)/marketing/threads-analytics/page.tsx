import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="Threads 성과"
      icon="📊"
      description="Threads 계정의 게시물 성과를 분석합니다."
      features={[
        "게시물별 노출 · 좋아요 · 댓글 · 리포스트 지표",
        "시간대별 · 요일별 인게이지먼트 히트맵",
        "포맷별(체크리스트 / QA / 스토리 등) 성과 비교",
        "팔로워 유입 · 이탈 추세",
        "상위 성과 포스트 자동 재활용 추천",
      ]}
    />
  );
}
