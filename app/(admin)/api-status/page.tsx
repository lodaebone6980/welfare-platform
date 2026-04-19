import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="API 수집현황"
      icon="📡"
      description="각 공공데이터 소스의 수집 상태와 최근 실행 로그를 확인합니다."
      features={[
        "복지로 · 정부24 · 기업마당 등 소스별 상태 카드",
        "최근 실행 시각 · 성공 / 실패 건수 · 다음 예정 시각",
        "실패 시 에러 로그 상세 보기 및 재시도 버튼",
        "소스별 7일 수집량 추이 그래프",
        "수동 수집 트리거(전체 · 선택 소스)",
      ]}
    />
  );
}
