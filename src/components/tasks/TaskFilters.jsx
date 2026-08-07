import { FiFilter, FiSearch } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { ALL_STATUSES } from "../../utils/tasks/taskConstants";

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

      <div className="relative">
        <FiFilter className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          aria-label="Filter by status"
          className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option>{ALL_STATUSES}</option>
          {TASK_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default TaskFilters;
