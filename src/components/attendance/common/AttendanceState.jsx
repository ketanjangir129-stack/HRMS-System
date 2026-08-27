import { FiAlertTriangle, FiInbox } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Loading / Empty / Error States
|--------------------------------------------------------------------------
| Every attendance panel shows the same three states, so they are defined
| once here instead of being re-styled in each table and card.
|--------------------------------------------------------------------------
*/

export function LoadingState({ message = "Loading..." }) {
  return (
    <div className="p-10 text-center sm:p-16">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
      <p className="mt-4 font-medium text-ink-subtle">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon = <FiInbox size={28} />,
  title = "Nothing to show",
  message = "",
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
        {title}
      </h3>

      {message && (
        <p className="mt-2 max-w-sm text-sm text-ink-subtle">{message}</p>
      )}

      {action && <div className="mt-6">{action}</div>}

    </div>
  );
}

export function ErrorState({
  title = "Failed to Load",
  message = "Something went wrong.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-16">

      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <FiAlertTriangle size={28} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-ink-subtle">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="ui-btn ui-btn-secondary mt-6 font-semibold"
        >
          Retry
        </button>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Table Skeleton
|--------------------------------------------------------------------------
*/

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-line-subtle">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-5 sm:px-6">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-surface-raised" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded-md bg-surface-raised" />
            <div className="h-3 w-24 animate-pulse rounded-md bg-surface-muted" />
          </div>
          <div className="hidden h-6 w-24 shrink-0 animate-pulse rounded-full bg-surface-muted sm:block" />
          <div className="hidden h-6 w-24 shrink-0 animate-pulse rounded-full bg-surface-muted md:block" />
          <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
