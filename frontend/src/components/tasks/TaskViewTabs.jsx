/*
|--------------------------------------------------------------------------
| Task View Tabs
|--------------------------------------------------------------------------
| "All / My tasks / Assigned by me / Overdue / Completed / Archived" — wo
| listen jo log roz kholte hain, ek click mein. Kaunse tabs dikhenge, page
| role ke hisaab se tay karta hai.
|
| Chhoti screen par tabs ek line mein sarakte hain (scroll), tootte nahi.
|--------------------------------------------------------------------------
*/

function TaskViewTabs({ views, active, counts = {}, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Task views"
      className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-5"
    >
      {views.map((view) => {
        const selected = view.key === active;
        const danger = view.tone === "danger" && counts[view.key] > 0;

        return (
          <button
            key={view.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(view.key)}
            className={`-mb-px inline-flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-2.5 pb-3 pt-3.5 text-sm font-semibold transition-colors ${
              selected
                ? "border-brand text-brand"
                : "border-transparent text-ink-subtle hover:text-ink"
            }`}
          >
            {view.label}

            {counts[view.key] !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                  danger
                    ? "bg-red-50 text-red-700"
                    : selected
                      ? "bg-blue-50 text-blue-700"
                      : "bg-surface-raised text-ink-subtle"
                }`}
              >
                {counts[view.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TaskViewTabs;
