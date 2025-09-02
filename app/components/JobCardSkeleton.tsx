export function JobCardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <div className="h-12 bg-[#374151] rounded-lg mb-6 animate-pulse max-w-2xl mx-auto"></div>
        <div className="h-6 bg-[#374151] rounded animate-pulse max-w-2xl mx-auto"></div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1F1F23] rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-[#374151] rounded mb-4"></div>
          <div className="h-6 bg-[#374151] rounded mb-2"></div>
          <div className="h-6 bg-[#374151] rounded w-3/4"></div>
        </div>
      </div>
    </div>
  );
}
