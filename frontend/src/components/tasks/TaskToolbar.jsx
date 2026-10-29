import { forwardRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import {
  ALL_STATUSES,
  DUE_FILTERS,
  PRIORITIES,
  PRIORITY_DOTS,
  SORT_OPTIONS,
  STATUS_DOTS,
} from "../../utils/tasks/taskConstants";
import SearchableSelect from "../common/SearchableSelect";
import TaskSelect from "./TaskSelect";

/*
|--------------------------------------------------------------------------
| Task Toolbar
|--------------------------------------------------------------------------
| Search aur filter chips — Status, Priority, Person, Due — aur kram (sort).
| Pehle sirf status ka filter tha aur koi sort nahi.
|
| Chip khaali ho to dashed (bas ek sawaal), lag jaye to brand rang mein
| bhara hua — ek nazar mein dikhta hai ki list kis cheez se chhanti hai.
|
| Saari values page ke URL mein bhi jaati hain (useTaskFilters), isliye
| refresh ya share kiya link wahi list kholta hai.
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = [
  { value: ALL_STATUSES, label: "Any status" },
  ...TASK_STATUSES.map((status) => ({ value: status, label: status, dot: STATUS_DOTS[status] })),
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Any priority" },
  ...PRIORITIES.map((priority) => ({ value: priority, label: priority, dot: PRIORITY_DOTS[priority] })),
];

const chipClass = (active) =>
  `inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
    active
      ? "border-solid border-blue-200 bg-blue-50 text-blue-700"
      : "border-dashed border-line text-ink-subtle hover:border-ink-faint hover:text-ink"
  }`;

const TaskToolbar = forwardRef(function TaskToolbar(
  {
    filters,
    onChange,
    onClear,
    people = [],
    showStatus = true,
    showPerson = true,
  },
  searchRef
) {
  const activeCount = [
    showStatus && filters.status !== ALL_STATUSES,
    filters.priority,
    showPerson && filters.assignee,
    filters.due,
  ].filter(Boolean).length;

  const personOptions = people.map((person) => ({
    value: person.id,
    label: person.name,
  }));

  const labelOf = (options, value) => options.find((option) => option.value === value)?.label;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
      <div className="relative lg:w-72">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          ref={searchRef}
          id="task-search"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Search title, description or person"
          aria-label="Search tasks"
          className="h-9 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand-ring"
        />
        {/* "/" dabane se yahin aate hain — chhota sa ishaara */}
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 text-[10.5px] text-ink-faint sm:block">
          /
        </kbd>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showStatus && (
          <TaskSelect
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(next) => onChange("status", next)}
            ariaLabel="Filter by status"
            className={chipClass(filters.status !== ALL_STATUSES)}
            trigger={<span>Status: <b className="font-semibold">{labelOf(STATUS_OPTIONS, filters.status)}</b></span>}
          />
        )}

        <TaskSelect
          options={PRIORITY_OPTIONS}
          value={filters.priority}
          onChange={(next) => onChange("priority", next)}
          ariaLabel="Filter by priority"
          className={chipClass(Boolean(filters.priority))}
          trigger={<span>Priority: <b className="font-semibold">{labelOf(PRIORITY_OPTIONS, filters.priority)}</b></span>}
        />

        {showPerson && (
          <div className="w-44">
            <SearchableSelect
              options={personOptions}
              value={filters.assignee}
              onChange={(next) => onChange("assignee", next || "")}
              placeholder="Person: Anyone"
              searchPlaceholder="Search people..."
              emptyMessage="No people found"
              ariaLabel="Filter by person"
              allowClear
              className={`${chipClass(Boolean(filters.assignee))} w-full`}
            />
          </div>
        )}

        <TaskSelect
          options={DUE_FILTERS}
          value={filters.due}
          onChange={(next) => onChange("due", next)}
          ariaLabel="Filter by due date"
          className={chipClass(Boolean(filters.due))}
          trigger={<span>Due: <b className="font-semibold">{labelOf(DUE_FILTERS, filters.due)}</b></span>}
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <FiX size={14} />
            Clear {activeCount > 1 ? `(${activeCount})` : ""}
          </button>
        )}
      </div>

      <div className="lg:ml-auto">
        <TaskSelect
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(next) => onChange("sort", next)}
          ariaLabel="Sort tasks"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-medium text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          trigger={<span>Sort: <b className="font-semibold text-ink">{labelOf(SORT_OPTIONS, filters.sort)}</b></span>}
        />
      </div>
    </div>
  );
});

export default TaskToolbar;
