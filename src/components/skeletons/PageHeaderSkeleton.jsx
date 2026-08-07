import Skeleton from "./Skeleton";

function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">

      <div className="space-y-2">

        <Skeleton className="h-7 w-48" />

        <Skeleton className="h-4 w-72" />

      </div>

      <div className="flex gap-3">

        <Skeleton className="h-10 w-24 rounded-lg" />

        <Skeleton className="h-10 w-32 rounded-lg" />

      </div>

    </div>
  );
}

export default PageHeaderSkeleton;