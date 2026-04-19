export default function AdminLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse" aria-label="로딩 중" role="status">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
      <div className="h-64 bg-gray-100 rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
      </div>
      <span className="sr-only">관리자 페이지를 불러오는 중입니다…</span>
    </div>
  );
}
