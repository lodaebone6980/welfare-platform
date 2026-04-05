export default function Loading() {
  return (
    <div className="pb-20 animate-pulse">
      {/* Compact Hero Skeleton */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6">
        <div className="h-6 bg-blue-500 rounded w-48 mb-2"></div>
        <div className="h-4 bg-blue-500 rounded w-32 mb-4"></div>
        <div className="h-12 bg-white/20 rounded-xl"></div>
      </div>

      {/* Category Skeleton */}
      <div className="px-4 py-4 border-b bg-white">
        <div className="flex gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-[56px]">
              <div className="w-12 h-12 rounded-2xl bg-gray-100"></div>
              <div className="h-3 bg-gray-100 rounded w-10"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Section Skeleton */}
      <div className="px-4 pt-5 pb-2">
        <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
        <div className="bg-white rounded-2xl border overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0">
              <div className="w-5 h-5 bg-gray-100 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-50 rounded w-1/4"></div>
              </div>
              <div className="h-7 bg-blue-50 rounded-lg w-16"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Section Skeleton */}
      <div className="px-4 pt-5 pb-4">
        <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="flex gap-2 mb-2">
                <div className="h-5 bg-blue-50 rounded-full w-12"></div>
                <div className="h-5 bg-gray-50 rounded w-14"></div>
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-1.5"></div>
              <div className="h-3 bg-gray-50 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-50 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
