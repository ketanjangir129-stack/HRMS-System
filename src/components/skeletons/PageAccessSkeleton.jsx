import Skeleton from "./Skeleton";

/*
|--------------------------------------------------------------------------
| Page Access Skeleton
|--------------------------------------------------------------------------
| Held in place of a page while its permissions are still being read.
|
| A blank screen or a full page spinner would be a worse answer than this: the
| wait is one small read, and the page is about to draw a header and a body
| whatever the answer turns out to be, so the shape is shown straight away and
| only the content waits.
|--------------------------------------------------------------------------
*/

function PageAccessSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">

        <Skeleton className="h-11 w-11 rounded-xl" />

        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">

        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}

      </div>

      {/* Body */}
      <Skeleton className="h-72 rounded-2xl" />

    </div>
  );
}

export default PageAccessSkeleton;
