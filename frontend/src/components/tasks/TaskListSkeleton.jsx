/*
|--------------------------------------------------------------------------
| Task List Skeleton
|--------------------------------------------------------------------------
| Pehli baar list aate waqt poore page ka loader nahi — page ka dhaancha
| turant dikhta hai aur sirf rows ki jagah halki pulsing pattiyan. User ko
| pata rehta hai ki kya aane wala hai.
|--------------------------------------------------------------------------
*/

function TaskListSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-line-subtle" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-4 px-4 py-4 lg:px-6">
          <span className="h-4 w-4 rounded bg-surface-raised" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-3.5 w-2/5 rounded bg-surface-raised" />
            <span className="block h-3 w-3/5 rounded bg-surface-muted" />
          </div>
          <span className="hidden h-7 w-16 rounded-full bg-surface-raised md:block" />
          <span className="hidden h-3.5 w-20 rounded bg-surface-raised md:block" />
          <span className="h-6 w-24 rounded-full bg-surface-raised" />
        </div>
      ))}
    </div>
  );
}

export default TaskListSkeleton;
