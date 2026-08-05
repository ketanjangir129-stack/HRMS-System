function AttendanceRequestSkeleton({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="h-5 w-48 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded-md bg-slate-100" />
      </div>

      {/* Table rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-6 py-5">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-md bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded-md bg-slate-100" />
            </div>
            <div className="h-6 w-24 shrink-0 animate-pulse rounded-full bg-slate-100" />
            <div className="hidden h-6 w-24 shrink-0 animate-pulse rounded-full bg-slate-100 sm:block" />
            <div className="flex justify-end gap-2">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AttendanceRequestSkeleton;
