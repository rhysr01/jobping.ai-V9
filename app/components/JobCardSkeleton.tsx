export function JobCardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12 sm:mb-16">
        <div className="h-10 bg-[#374151] rounded-lg mb-4 animate-pulse max-w-lg mx-auto" />
        <div className="h-5 bg-[#374151] rounded animate-pulse max-w-2xl mx-auto" />
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block">
        <div className="gmail-container max-w-4xl mx-auto animate-pulse">
          <div className="gmail-header flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-[#374151] rounded" />
              <div className="w-24 h-6 bg-[#374151] rounded" />
            </div>
            <div className="w-64 h-8 bg-[#374151] rounded-lg" />
          </div>
          <div className="flex">
            <div className="w-64 bg-[#1F1F23] p-4 space-y-3 border-r border-[#2D2D30]">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-8 bg-[#374151] rounded" />
              ))}
            </div>
            <div className="flex-1 p-6 space-y-6 bg-[#1F1F1F]">
              {[1,2,3].map(i => (
                <div key={i} className="bg-[#2D2D30] rounded-lg p-4 space-y-3 border border-[#3C4043]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#374151] rounded-lg" />
                    <div className="space-y-2">
                      <div className="w-48 h-4 bg-[#374151] rounded" />
                      <div className="w-32 h-3 bg-[#374151] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile skeleton */}
      <div className="md:hidden bg-gradient-to-br from-[#1F1F1F] to-[#2D2D30] rounded-xl border border-[#3C4043] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#374151] rounded-full" />
          <div>
            <div className="w-32 h-4 bg-[#374151] rounded mb-2" />
            <div className="w-24 h-3 bg-[#374151] rounded" />
          </div>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#2D2D30] rounded-lg p-4 border border-[#3C4043]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#374151] rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="w-40 h-4 bg-[#374151] rounded" />
                  <div className="w-24 h-3 bg-[#374151] rounded" />
                </div>
                <div className="w-10 h-5 bg-[#374151] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
