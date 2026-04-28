import { Skeleton } from "@/components/ui/skeleton";

export default function InfluencersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Tab strip skeleton */}
      <div className="flex gap-1 border-b">
        <Skeleton className="h-9 w-32 rounded-none border-b-2 border-transparent" />
        <Skeleton className="h-9 w-32 rounded-none border-b-2 border-transparent" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-white">
        <div className="border-b p-3">
          <div className="grid grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b p-3">
            <div className="grid grid-cols-8 items-center gap-4">
              {Array.from({ length: 8 }).map((__, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
