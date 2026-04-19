import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="구글광고 에이전트"
      icon="🅖"
      description="Google Ads 캠페인을 AI 에이전트로 운영합니다."
      features={[
        "Google Ads API 연동 캠페인 · 광고그룹 · 키워드 조회",
        "AI 기반 신규 광고 카피 · 헤드라인 · 설명문 생성",
        "성과 저조 키워드 자동 일시중지 제안",
        "일일 예산 · 입찰 전략 최적화 리포트",
        "전환 목표별 ROAS 리포트",
      ]}
    />
  );
}
