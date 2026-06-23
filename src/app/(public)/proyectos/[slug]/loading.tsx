export default function ProjectDetailLoading() {
  return (
    <div className="min-h-screen bg-white pt-20 animate-pulse">
      {/* Breadcrumb */}
      <div className="bg-brand-surface border-b border-gray-200">
        <div className="container-section py-3">
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="container-section py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-200 rounded" />
            </div>
            {/* Carousel skeleton */}
            <div className="h-80 bg-gray-200 rounded-lg" />
            {/* Description */}
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-4 w-5/6 bg-gray-100 rounded" />
              <div className="h-4 w-4/6 bg-gray-100 rounded" />
            </div>
            {/* Typologies table */}
            <div className="space-y-2">
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <div className="bg-brand-surface p-6 border border-gray-200 space-y-4">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-10 w-36 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-px bg-gray-200 my-4" />
              <div className="h-11 bg-gray-300 rounded" />
            </div>
            <div className="bg-brand-surface p-6 space-y-3">
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-11 bg-gray-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
