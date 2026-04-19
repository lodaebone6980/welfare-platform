import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="유입 분석"
      icon="📈"
      description="웹사이트 트래픽과 유입 경로를 분석합니다."
      features={[
        "일·주·월 PV / UV / 세션 지표 카드",
        "유입 채널별 분석 (검색 · 광고 · SNS · 직접)",
        "랜딩 페이지별 성과 순위",
        "디바이스 · 지역 · 재방문율 분석",
        "광고 매체별 ROAS 요약",
      ]}
    />
  );
}
