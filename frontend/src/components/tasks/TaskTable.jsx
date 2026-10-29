import {
  FiCheckSquare,
  FiEdit2,
  FiInbox,
  FiPlus,
  FiRotateCcw,
  FiArchive,
  FiTrash2,
} from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import {
  PRIMARY_BUTTON_CLASS,
  STATUS_DOTS,
} from "../../utils/tasks/taskConstants";
import {
  dueLabel,
  formatDate,
  formatTime,
  isOverdue,
  memberIdsOf,
  personName,
  taskTimeMs,
  todayInputValue,
  workingIdsOf,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";
import TaskSelect from "./TaskSelect";

/*
|--------------------------------------------------------------------------
| Task Table
|--------------------------------------------------------------------------
| Sirf list dikhata hai. Server se baat nahi karta — status badalna, edit,
| archive page ka kaam hai; ye bas callback bula deta hai.
|
| Har row par:
|   - checkbox (bulk ke liye, jab page selectable de)
|   - title, description ki ek line, steps ki ginti ("2/5")
|   - team — owner ka naam, neeche baaki logon ke naam
|   - due date aur "in 2 days" / "3 days overdue"
|   - waqt — kitna laga (Start/Stop sessions se), koi laga ho to hara dot
|   - status dropdown — status yahin se badalta hai, Actions mein dobara nahi
|
| md se neeche wahi task ek card hai, row nahi.
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: status,
  dot: STATUS_DOTS[status],
}));

// Click upar row tak na jaye — warna button dabate hi drawer bhi khul jaata
const stop = {
  onClick: (event) => event.stopPropagation(),
  onKeyDown: (event) => event.stopPropagation(),
};

function IconAction({ tone, title, onClick, icon }) {
  const styles = {
    edit: "hover:border-brand hover:bg-blue-50 hover:text-brand",
    danger: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
    neutral: "hover:border-ink-faint hover:bg-surface-muted hover:text-ink",
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line text-ink-subtle transition-all ${styles[tone]}`}
    >
      {icon}
    </button>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded accent-blue-600"
    />
  );
}

// "2/5" — steps kitne hue. Sab ho gaye to hara
function StepCount({ task }) {
  if (!task.subtaskTotal) return null;

  const done = task.subtaskDone || 0;
  const complete = done === task.subtaskTotal;

  return (
    <span
      title={`${done} of ${task.subtaskTotal} steps done`}
      className={`ml-2 inline-flex items-center gap-1 rounded-md px-1.5 align-[1px] text-[11px] font-semibold tabular-nums ${
        complete ? "bg-emerald-50 text-emerald-700" : "bg-surface-raised text-ink-subtle"
      }`}
    >
      <FiCheckSquare size={10} />
      {done}/{task.subtaskTotal}
    </span>
  );
}

/*
| Waqt — kitna laga, aur koi abhi laga hai to hara dhadakta dot. "now" page
| se aata hai, taaki chalta waqt aage badhta dikhe.
*/
function TimeCell({ task, now }) {
  const running = workingIdsOf(task).length > 0;
  const ms = taskTimeMs(task, now);

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm tabular-nums ${ms ? "font-semibold text-ink-muted" : "text-ink-faint"}`}>
      {running && (
        <span title="Someone is working on this now" className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {formatTime(ms)}
    </span>
  );
}

function TaskTable({
  tasks,
  names = {},
  now = 0,
  hasTasks,
  showTeam = true,
  archivedMode = false,
  selectable = false,
  selectedIds,
  onToggle,
  onToggleAll,
  canEdit = () => false,
  canChangeStatus = () => false,
  canArchive = false,
  canDeletePermanent = false,
  onStatusChange,
  onEdit,
  onArchive,
  onRestore,
  onDeletePermanent,
  onRowClick,
  onCreate,
}) {
  const today = todayInputValue();

  const allSelected =
    selectable && tasks.length > 0 && tasks.every((task) => selectedIds?.has(task.id));

  /*
  | Status ka pill hi dropdown hai. Hover pehle button par ring lagata tha,
  | par button inline-block tha aur line-height se pill se ooncha — ring
  | pill ke bahar tedhi baithti thi. Ab button pill jitna hi hai
  | (inline-flex, leading-none), aur hover par halki ring aur chhaya pill ke
  | bilkul kinare par aati hai.
  */
  const statusControl = (task) =>
    !archivedMode && canChangeStatus(task) ? (
      <span className="inline-flex" {...stop}>
        <TaskSelect
          options={STATUS_OPTIONS}
          value={task.status || TASK_STATUSES[0]}
          onChange={(next) => onStatusChange(task, next)}
          ariaLabel={`Change status of ${task.title}`}
          className="inline-flex cursor-pointer items-center rounded-full leading-none transition-all duration-150 hover:shadow-sm hover:ring-2 hover:ring-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
          trigger={<TaskBadge value={task.status || TASK_STATUSES[0]} withCaret />}
        />
      </span>
    ) : (
      <TaskBadge value={task.status || TASK_STATUSES[0]} />
    );

  const rowActions = (task) =>
    archivedMode ? (
      <>
        {canArchive && (
          <IconAction tone="neutral" title={`Restore ${task.title}`} onClick={() => onRestore(task)} icon={<FiRotateCcw size={15} />} />
        )}
        {canDeletePermanent && (
          <IconAction tone="danger" title={`Delete ${task.title} permanently`} onClick={() => onDeletePermanent(task)} icon={<FiTrash2 size={15} />} />
        )}
      </>
    ) : (
      <>
        {canEdit(task) && (
          <IconAction tone="edit" title={`Edit ${task.title}`} onClick={() => onEdit(task)} icon={<FiEdit2 size={15} />} />
        )}
        {canArchive && (
          <IconAction tone="danger" title={`Archive ${task.title}`} onClick={() => onArchive(task)} icon={<FiArchive size={15} />} />
        )}
      </>
    );

  // Sirf naam — owner upar, baaki team ke naam neeche ek line mein
  const memberNames = (task) =>
    memberIdsOf(task).map((id) => personName(id, names)).join(", ");

  const teamCell = (task) => {
    const members = memberNames(task);

    return (
      <div className="min-w-0 max-w-56">
        <p className="truncate text-sm font-semibold text-ink-muted">
          {personName(task.assignedTo, names)}
        </p>
        {members && (
          <p title={members} className="truncate text-xs text-ink-faint">
            with {members}
          </p>
        )}
      </div>
    );
  };

  const dueCell = (task) => {
    const overdue = isOverdue(task, today);
    const dueToday = task.dueDate === today && task.status !== "Completed";

    return (
      <div className="whitespace-nowrap">
        <p className={`text-sm tabular-nums ${overdue ? "font-semibold text-red-600" : "font-medium text-ink-muted"}`}>
          {formatDate(task.dueDate)}
        </p>
        {task.dueDate && task.status !== "Completed" && (
          <p className={`text-xs font-medium ${overdue ? "text-red-500" : dueToday ? "text-amber-600" : "text-ink-faint"}`}>
            {dueLabel(task.dueDate, today)}
          </p>
        )}
      </div>
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-ink-faint">
          <FiInbox size={26} />
        </span>

        {hasTasks ? (
          <div>
            <p className="font-semibold text-ink">No matching tasks</p>
            <p className="mt-1 text-sm text-ink-subtle">
              Try a different search, filter or tab.
            </p>
          </div>
        ) : archivedMode ? (
          <div>
            <p className="font-semibold text-ink">Nothing archived</p>
            <p className="mt-1 text-sm text-ink-subtle">Archived tasks can be restored from here.</p>
          </div>
        ) : (
          <>
            <div>
              <p className="font-semibold text-ink">
                {showTeam ? "No tasks yet" : "Nothing assigned yet"}
              </p>
              <p className="mt-1 text-sm text-ink-subtle">
                {onCreate
                  ? "Create your first task to start tracking work."
                  : "Tasks assigned to you will show up here."}
              </p>
            </div>

            {onCreate && (
              <button type="button" onClick={onCreate} className={PRIMARY_BUTTON_CLASS}>
                <FiPlus />
                Create task
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  const rowProps = (task) => ({
    onClick: () => onRowClick?.(task),
    onKeyDown: (event) => {
      if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onRowClick(task);
    },
    tabIndex: onRowClick ? 0 : undefined,
  });

  const selectedRow = (task) =>
    selectedIds?.has(task.id) ? "bg-blue-50/40" : "";

  const overdueEdge = (task) =>
    isOverdue(task, today) ? "shadow-[inset_3px_0_0_var(--color-red-500)]" : "";

  return (
    <>
      {/* Mobile */}
      <div className="divide-y divide-line-subtle md:hidden">
        {tasks.map((task) => (
          <div
            key={task.id}
            {...rowProps(task)}
            className={`space-y-3 px-4 py-4 transition-colors ${selectedRow(task)} ${overdueEdge(task)} ${
              onRowClick ? "cursor-pointer active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <span className="pt-0.5">
                  <Checkbox checked={selectedIds?.has(task.id) || false} onChange={() => onToggle(task)} label={`Select ${task.title}`} />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {task.title}
                  <StepCount task={task} />
                </p>
                {showTeam && (
                  <p className="mt-0.5 truncate text-xs text-ink-subtle">
                    {personName(task.assignedTo, names)}
                    {memberNames(task) ? ` · with ${memberNames(task)}` : ""}
                  </p>
                )}
              </div>

              <span className="shrink-0">
                <TaskBadge value={task.priority || "Medium"} variant="priority" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-muted px-3 py-2.5">
              {statusControl(task)}
              <TimeCell task={task} now={now} />
              <span className="ml-auto">{dueCell(task)}</span>
            </div>

            <div className="flex items-center justify-end gap-2">{rowActions(task)}</div>
          </div>
        ))}
      </div>

      {/* Tablet / desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-180 border-collapse text-left xl:min-w-230">
          <thead className="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-subtle">
            <tr>
              {selectable && (
                <th className="w-10 py-3 pl-5 pr-1">
                  <Checkbox
                    checked={allSelected}
                    onChange={() => onToggleAll(!allSelected)}
                    label="Select all tasks on this page"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-semibold">Task</th>
              {showTeam && <th className="px-4 py-3 font-semibold">Team</th>}
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Due</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Time</th>
              <th className="hidden px-4 py-3 text-center font-semibold lg:table-cell">Priority</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="whitespace-nowrap px-4 py-3 pr-5 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line-subtle">
            {tasks.map((task) => (
              <tr
                key={task.id}
                {...rowProps(task)}
                title={onRowClick ? `Open ${task.title}` : undefined}
                className={`transition-colors hover:bg-surface-muted ${selectedRow(task)} ${
                  onRowClick ? "cursor-pointer focus:outline-none focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand" : ""
                }`}
              >
                {selectable && (
                  <td className={`py-4 pl-5 pr-1 ${overdueEdge(task)}`}>
                    <Checkbox checked={selectedIds?.has(task.id) || false} onChange={() => onToggle(task)} label={`Select ${task.title}`} />
                  </td>
                )}

                <td className={`max-w-90 px-4 py-3.5 ${selectable ? "" : overdueEdge(task)}`}>
                  <p className="truncate text-sm font-semibold text-ink">
                    {task.title}
                    <StepCount task={task} />
                  </p>
                  {task.description && (
                    <p className="mt-0.5 truncate text-xs text-ink-subtle">{task.description}</p>
                  )}
                  <span className="mt-1.5 inline-block lg:hidden">
                    <TaskBadge value={task.priority || "Medium"} variant="priority" />
                  </span>
                </td>

                {showTeam && <td className="px-4 py-3.5">{teamCell(task)}</td>}

                <td className="px-4 py-3.5">{dueCell(task)}</td>

                <td className="px-4 py-3.5">
                  <TimeCell task={task} now={now} />
                </td>

                <td className="hidden px-4 py-3.5 text-center lg:table-cell">
                  <TaskBadge value={task.priority || "Medium"} variant="priority" />
                </td>

                <td className="px-4 py-3.5 text-center">{statusControl(task)}</td>

                <td className="whitespace-nowrap px-4 py-3.5 pr-5">
                  <div className="flex h-8 items-center justify-end gap-2">{rowActions(task)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default TaskTable;
