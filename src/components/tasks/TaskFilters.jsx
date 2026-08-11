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
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {SCOPES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onScopeChange(option.key)}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
                scope === option.key
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search tasks or people..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-64"
        />
      </div>

      {/*
        Filter icon trigger ke andar nahi baith sakta (wo TaskSelect ka apna
        button hai), isliye upar se rakha hai — pl-10 uski jagah chhodta hai
        aur pointer-events-none se click neeche button tak pahunch jaata hai.
      */}
      <div className="relative lg:w-52">
        <FiFilter className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />

        <TaskSelect
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={onStatusChange}
          ariaLabel="Filter by status"
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
}

export default TaskFilters;
