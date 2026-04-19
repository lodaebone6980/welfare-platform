import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="검색 트렌딩"
      icon="🔥"
      description="사이트 내 검색어 트렌드와 외부 검색량을 추적합니다."
      features={[
        "내부 검색어 Top 100 실시간 순위",
        "급상승 키워드 · 신규 키워드 알림",
        "네이버 · 구글 트렌드 API 연동 외부 검색량",
        "키워드별 매칭 정책 수 · 클릭률 비교",
        "키워드 기반 신규 콘텐츠 추천",
      ]}
    />
  );
}
