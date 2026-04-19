import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="네이버 블로그"
      icon="✍️"
      description="네이버 블로그 포스팅을 자동화합니다."
      features={[
        "정책별 SEO 최적 블로그 초안 자동 생성",
        "이미지 · 인용 · 관련 정책 자동 삽입",
        "예약 발행 · 다계정 관리",
        "유입 키워드 · 상위 노출 현황",
        "Power Content 후보 자동 선정",
      ]}
    />
  );
}
