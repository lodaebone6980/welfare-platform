import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="네이버 광고"
      icon="Ⓝ"
      description="네이버 검색광고 · 성과형 광고를 관리합니다."
      features={[
        "네이버 검색광고 API 연동 캠페인 · 키워드 관리",
        "키워드 확장 · 입찰가 추천",
        "AI 카피 생성 · 확장 소재 제안",
        "키워드별 노출 · 클릭 · 전환 리포트",
        "경쟁사 키워드 모니터링",
      ]}
    />
  );
}
