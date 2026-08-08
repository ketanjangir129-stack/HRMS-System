import Skeleton from "./Skeleton";

/*
|--------------------------------------------------------------------------
| Roles & Access Skeleton
|--------------------------------------------------------------------------
| Held in place of the permission matrix while the configuration is read.
|
| The two role tabs and the list of groups are drawn straight away, because
| the shape does not depend on the answer - only which boxes are ticked does.
|--------------------------------------------------------------------------
*/

function RoleAccessSkeleton() {
  return (
    <div className="space-y-4">

      {/* Role tabs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-[76px] rounded-2xl" />
        ))}

      </div>

      {/* Groups */}
      <div className="space-y-3">

        {Array.from({ length: 6 }).map((_, index) => (

          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >

            <Skeleton className="h-[22px] w-[22px] rounded-[7px]" />

            <Skeleton className="h-10 w-10 rounded-xl" />

            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>

            <Skeleton className="h-9 w-9 rounded-xl" />

          </div>

        ))}

      </div>

    </div>
  );
}

export default RoleAccessSkeleton;
