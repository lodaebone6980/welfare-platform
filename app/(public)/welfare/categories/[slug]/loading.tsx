export default function CategorySlugLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-pulse">
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-8 pb-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-24 bg-white/20 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-white/20 rounded mb-2" />
            <div className="h-3 w-20 bg-white/15 rounded" />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="flex gap-1">
            <div className="h-6 w-14 bg-gray-200 rounded-lg" />
            <div className="h-6 w-14 bg-gray-100 rounded-lg" />
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-4 w-12 bg-blue-100 rounded" />
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
              <div className="h-4 w-4/5 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-100 rounded mb-1" />
              <div className="h-3 w-3/5 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
