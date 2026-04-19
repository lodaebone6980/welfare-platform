import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="Meta 광고"
      icon="Ⓜ️"
      description="페이스북 · 인스타그램 Meta 광고를 관리합니다."
      features={[
        "Meta Marketing API 연동 캠페인 지표 조회",
        "AI 크리에이티브 생성 · A/B 테스트 세팅",
        "타겟 오디언스 · Lookalike 자동 생성",
        "CPM · CPC · CPA 비교 리포트",
        "픽셀 이벤트 기반 리마케팅 시나리오",
      ]}
    />
  );
}
