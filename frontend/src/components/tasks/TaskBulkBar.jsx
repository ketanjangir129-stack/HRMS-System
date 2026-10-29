import { FiArchive, FiLoader, FiX } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { STATUS_DOTS } from "../../utils/tasks/taskConstants";
import SearchableSelect from "../common/SearchableSelect";
import TaskSelect from "./TaskSelect";

/*
|--------------------------------------------------------------------------
| Task Bulk Bar
|--------------------------------------------------------------------------
| Kuch rows chuni hon tabhi dikhti hai — chune hue tasks par ek saath status,
| naya owner ya archive. Har button apni permission par: jo haq nahi wo
| button bhi nahi.
|
| Gehri patti (ink par canvas) jaan-boojhkar — list ke beech ye "abhi tum
| selection mode mein ho" saaf bata deti hai.
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: status,
  dot: STATUS_DOTS[status],
}));

const barButton =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-canvas/10 px-3 text-sm font-medium text-canvas transition-colors hover:bg-canvas/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-canvas/60 disabled:cursor-not-allowed disabled:opacity-50";

function TaskBulkBar({
  count,
  busy = false,
  people = [],
  canChangeStatus = true,
  canReassign = false,
  canArchive = false,
  onStatus,
  onReassign,
  onArchive,
  onClear,
}) {
  if (!count) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="mx-4 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink px-3 py-2 text-canvas sm:mx-5"
    >
      <strong className="mr-1 text-sm">
        {count} selected
      </strong>

      {canChangeStatus && (
        <TaskSelect
          options={STATUS_OPTIONS}
          value=""
          onChange={onStatus}
          disabled={busy}
          ariaLabel="Change status of selected tasks"
          className={barButton}
          trigger={
            <span className="inline-flex items-center gap-1.5">
              <FiLoader size={14} />
              Change status
            </span>
          }
        />
      )}

      {canReassign && (
        <div className="w-44">
          <SearchableSelect
            options={people.map((person) => ({ value: person.id, label: person.name }))}
            value=""
            onChange={(next) => next && onReassign(next)}
            placeholder="Reassign to…"
            searchPlaceholder="Search people..."
            emptyMessage="No people found"
            ariaLabel="Reassign selected tasks"
            disabled={busy}
            className={`${barButton} w-full`}
          />
        </div>
      )}

      {canArchive && (
        <button type="button" onClick={onArchive} disabled={busy} className={`${barButton} text-red-200`}>
          <FiArchive size={14} />
          Archive
        </button>
      )}

      {busy && <span className="text-xs text-canvas/70">Working…</span>}

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-auto inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-canvas/80 transition-colors hover:bg-canvas/10 hover:text-canvas"
      >
        <FiX size={16} />
      </button>
    </div>
  );
}

export default TaskBulkBar;
