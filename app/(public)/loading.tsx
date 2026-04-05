export default function HomeLoading() {
  return (
    <div className="pb-20 animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-8">
        <div className="h-8 bg-blue-500/30 rounded w-3/4 mx-auto mb-3" />
        <div className="h-4 bg-blue-500/30 rounded w-1/2 mx-auto mb-6" />
        <div className="h-12 bg-white/20 rounded-xl w-full max-w-md mx-auto" />
      </div>

      {/* Stats skeleton */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow p-4 grid grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="text-center">
              <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-gray-100 rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Categories skeleton */}
      <div className="px-4 mt-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="grid grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="h-3 bg-gray-100 rounded w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Policy cards skeleton */}
      <div className="px-4 mt-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between mb-2">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-100 rounded w-12" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
