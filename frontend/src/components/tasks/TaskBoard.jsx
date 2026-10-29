import { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { STATUS_DOTS } from "../../utils/tasks/taskConstants";
import {
  dueLabel,
  formatDate,
  isOverdue,
  teamOf,
  todayInputValue,
  workingIdsOf,
} from "../../utils/tasks/taskUtils";
import PeopleStack from "./PeopleStack";
import TaskBadge from "./TaskBadge";

/*
|--------------------------------------------------------------------------
| Task Board
|--------------------------------------------------------------------------
| Wahi tasks, chaar column — ek status ek column. Card ko kheench kar doosre
| column mein chhodo to status badalta hai, usi API se jo dropdown use
| karta hai. Koi library nahi — browser ka apna drag & drop.
|
| Jo card tum badal nahi sakte (task tumhara nahi) wo kheencha nahi jaata.
| Phone par columns side mein sarakte hain; wahan card kholkar status
| badalna zyada aasaan hai, drag nahi.
|--------------------------------------------------------------------------
*/

function TaskBoard({ tasks, names = {}, canChangeStatus = () => false, onStatusChange, onRowClick, onCreate }) {
  const today = todayInputValue();
  const [dragId, setDragId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const dropOn = (status) => {
    const task = tasks.find((item) => item.id === dragId);
    setDragId(null);
    setOverColumn(null);
    if (task && task.status !== status) onStatusChange(task, status);
  };

  return (
    <div className="ui-scroll overflow-x-auto px-4 pb-5 pt-4 sm:px-5">
      <div className="grid min-w-240 grid-cols-4 gap-4">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((task) => (task.status || TASK_STATUSES[0]) === status);
          const highlighted = overColumn === status && dragId;

          return (
            <section
              key={status}
              aria-label={`${status} column`}
              onDragOver={(event) => {
                if (!dragId) return;
                event.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(status);
              }}
              className={`flex min-h-72 flex-col gap-2.5 rounded-2xl border p-2.5 transition-colors ${
                highlighted ? "border-blue-300 bg-blue-50/40" : "border-line-subtle bg-surface-muted"
              }`}
            >
              <header className="flex items-center gap-2 px-1.5 pb-1 pt-1">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOTS[status]}`} />
                <h3 className="text-sm font-bold text-ink">{status}</h3>
                <span className="text-xs font-semibold text-ink-faint tabular-nums">{column.length}</span>
              </header>

              {column.map((task) => {
                const overdue = isOverdue(task, today);
                const draggable = canChangeStatus(task);

                return (
                  <article
                    key={task.id}
                    draggable={draggable}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", task.id);
                      setDragId(task.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverColumn(null);
                    }}
                    onClick={() => onRowClick(task)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(task);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${task.title}, ${status}`}
                    className={`flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${dragId === task.id ? "opacity-50" : ""} ${
                      overdue ? "shadow-[inset_3px_0_0_var(--color-red-500)]" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold leading-snug text-ink">{task.title}</p>

                    <div className="flex items-center gap-2">
                      <TaskBadge value={task.priority || "Medium"} variant="priority" />
                      {task.subtaskTotal > 0 && (
                        <span className="text-[11px] font-semibold text-ink-subtle tabular-nums">
                          {task.subtaskDone || 0}/{task.subtaskTotal}
                        </span>
                      )}
                      <span className="ml-auto">
                        <PeopleStack ids={teamOf(task)} names={names} workingIds={workingIdsOf(task)} size="xs" />
                      </span>
                    </div>

                    {task.dueDate && (
                      <p
                        title={formatDate(task.dueDate)}
                        className={`text-xs font-medium ${overdue ? "text-red-600" : "text-ink-faint"}`}
                      >
                        {task.status === "Completed" ? formatDate(task.dueDate) : dueLabel(task.dueDate, today)}
                      </p>
                    )}
                  </article>
                );
              })}

              {status === TASK_STATUSES[0] && onCreate && (
                <button
                  type="button"
                  onClick={onCreate}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2 text-sm text-ink-faint transition-colors hover:border-ink-faint hover:text-ink"
                >
                  <FiPlus size={14} />
                  Add task
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default TaskBoard;
