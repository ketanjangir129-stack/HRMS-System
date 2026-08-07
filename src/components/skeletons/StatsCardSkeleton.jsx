import Skeleton from "./Skeleton";

function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">

        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>

        <Skeleton className="h-12 w-12 rounded-xl" />

      </div>
    </div>
  );
}

export default StatsCardSkeleton;