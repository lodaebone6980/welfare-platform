import ComingSoon from '@/components/admin/ComingSoon';

export default function Page() {
  return (
    <ComingSoon
      title="카테고리 관리"
      icon="🗂️"
      description="정책이 노출되는 카테고리 · 태그 체계를 관리합니다."
      features={[
        "대분류 / 중분류 / 소분류 트리 편집",
        "카테고리별 SEO 메타데이터 · 설명문 설정",
        "각 카테고리에 연결된 정책 건수 · 트래픽 요약",
        "대표 이미지 · 아이콘 업로드",
      ]}
    />
  );
}
