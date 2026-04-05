export default function PolicyDetailLoading() {
  return (
    <div className="pb-20 animate-pulse">
      {/* Breadcrumb */}
      <div className="px-4 py-3">
        <div className="h-3 bg-gray-200 rounded w-48" />
      </div>

      {/* Title area */}
      <div className="px-4 mb-4">
        <div className="h-5 bg-blue-100 rounded w-16 mb-3" />
        <div className="h-7 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-24" />
      </div>

      {/* Summary box */}
      <div className="mx-4 bg-gray-50 rounded-xl p-4 mb-6">
        <div className="h-5 bg-gray-200 rounded w-24 mb-4" />
        {[1,2,3,4].map(i => (
          <div key={i} className="flex gap-3 mb-3">
            <div className="h-4 bg-gray-200 rounded w-20 shrink-0" />
            <div className="h-4 bg-gray-100 rounded flex-1" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="px-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-5/6" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>

      {/* Apply button skeleton */}
      <div className="px-4 mt-8">
        <div className="h-14 bg-blue-200 rounded-xl w-full" />
      </div>
    </div>
  );
}
