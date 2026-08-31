import { FiFilter, FiSearch } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { ALL_STATUSES, STATUS_DOTS } from "../../utils/tasks/taskConstants";
import TaskSelect from "./TaskSelect";

/*
|--------------------------------------------------------------------------
| Task Filters
|--------------------------------------------------------------------------
| Scope toggle + search box + status dropdown. Khud kuch chhaanta nahi —
| value upar (page mein) rehti hai, ye sirf dikhata hai aur badalne par
| bata deta hai.
|
| Scope toggle sirf un managers ko dikhta hai jinka apna employee record
| hai — owner ka nahi hota, isliye uske liye showScope false rehta hai.
|--------------------------------------------------------------------------
*/

const SCOPES = [
  { key: "all", label: "All tasks" },
  { key: "mine", label: "My tasks" },
];

/*
| Pehla option "All statuses" hai — koi status nahi, isliye uske aage dot
| bhi nahi. Baaki har row ka dot wahi rang deta hai jo uske badge ka hai,
| to list dekhkar hi pata chal jaata hai kis par filter lag raha hai.
*/
const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: ALL_STATUSES },
  ...TASK_STATUSES.map((status) => ({
    value: status,
    label: status,
    dot: STATUS_DOTS[status],
  })),
];

function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  scope,
  onScopeChange,
  showScope = false,
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {showScope && (
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          {SCOPES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onScopeChange(option.key)}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                scope === option.key
                  ? "bg-brand text-white shadow-sm"
                  : "text-ink-muted hover:bg-surface-muted hover:text-brand"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tasks or people..."
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand-ring lg:w-64"
        />
      </div>

      {/*
        Filter icon trigger ke andar nahi baith sakta (wo TaskSelect ka apna
        button hai), isliye upar se rakha hai — pl-10 uski jagah chhodta hai
        aur pointer-events-none se click neeche button tak pahunch jaata hai.
      */}
      <div className="relative lg:w-52">
        <FiFilter className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-faint" />

        <TaskSelect
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={onStatusChange}
          ariaLabel="Filter by status"
          className="w-full cursor-pointer rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition-all focus:border-brand focus:ring-3 focus:ring-brand-ring"
        />
      </div>
    </div>
  );
}

export default TaskFilters;
