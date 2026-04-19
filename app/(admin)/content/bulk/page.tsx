import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="대량 생성"
      icon="⚡"
      description="여러 정책을 한 번에 자동 생성·편집하는 도구입니다."
      features={[
        "CSV · Excel 업로드로 정책 일괄 등록",
        "AI 프롬프트 기반 템플릿에서 다수의 콘텐츠 생성",
        "카테고리 · 태그 자동 매핑 및 검수 워크플로우",
        "생성 결과 미리보기 후 일괄 승인 / 반려",
      ]}
    />
  );
}
