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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">

        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-17 rounded-2xl sm:h-19" />
        ))}

      </div>

      {/*
      | Groups
      |
      | The placeholder rows mirror the real ones, which includes what the real
      | ones drop on a phone: the page icon is hidden below `sm` and the two
      | text bars are widths rather than fixed pixels, so nothing here is wider
      | than the row it is standing in.
      */}
      <div className="space-y-3">

        {Array.from({ length: 6 }).map((_, index) => (

          <div
            key={index}
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:gap-4 sm:px-5 sm:py-4"
          >

            <Skeleton className="h-[22px] w-[22px] shrink-0 rounded-[7px]" />

            <Skeleton className="hidden h-10 w-10 shrink-0 rounded-xl sm:block" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 max-w-40" />
              <Skeleton className="h-3 w-full max-w-64" />
            </div>

            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />

          </div>

        ))}

      </div>

    </div>
  );
}

export default RoleAccessSkeleton;
