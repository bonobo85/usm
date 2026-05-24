export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-panel-2 rounded-md ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-0 overflow-hidden">
            <Skeleton className="h-12 w-full rounded-none" />
            <div className="px-4 pt-2.5 pb-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
