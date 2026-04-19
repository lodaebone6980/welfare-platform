import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="틱톡"
      icon="🎵"
      description="TikTok 비즈니스 계정과 광고를 관리합니다."
      features={[
        "AI 숏폼 스크립트 · 훅 · 자막 자동 생성",
        "예약 업로드 · 해시태그 추천",
        "비디오별 재생 · 완주율 · 공유 지표",
        "Spark Ads 부스팅 후보 자동 추천",
        "트렌딩 사운드 · 챌린지 모니터링",
      ]}
    />
  );
}
