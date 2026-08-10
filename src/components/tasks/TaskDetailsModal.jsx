import { useEffect } from "react";
import { Eye, X } from "lucide-react";
import {
  assigneeName,
  dueLabel,
  formatDate,
  formatTimestamp,
  isOverdue,
  todayInputValue,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";

/*
|--------------------------------------------------------------------------
| Task Details Modal
|--------------------------------------------------------------------------
| Poori task read-only. Table mein description ek line par kat jaati hai,
| aur poori padhne ka ek hi raasta tha — Edit modal, jo Employee ke paas
| nahi hai.
|
| Sirf Close — Edit/Delete row mein hi rehne chahiye. Firebase se koi baat
| nahi, task page ki state se aata hai.
|--------------------------------------------------------------------------
*/

// Label baayein, value daayein — chhoti screen par upar-neeche
function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-32 shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function TaskDetailsModal({
  open,
  task,
  employees = [],
  // tasks.viewAll se aata hai — apne hi tasks dikh rahe hon to Assignee
  // row bekaar hai, bilkul TaskTable ke Assignee column jaisa.
  showAssignee = true,
  onClose,
}) {
  // Escape se band, aur peeche ka page scroll na ho
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // task null ho sakta hai — realtime listener se delete ho jaye to page
  // usko null kar deta hai aur modal apne aap band ho jaata hai
  if (!open || !task) return null;

  const today = todayInputValue();
  const overdue = isOverdue(task, today);
  const name = assigneeName(task, employees);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-details-title"
    >
      {/* Andar click karne par modal band na ho */}
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Eye size={20} />
            </div>
            <div>
              <h2
                id="task-details-title"
                className="text-lg font-semibold text-slate-900"
              >
                Task details
              </h2>
              <p className="text-sm text-slate-500">View only</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — lambi description par yahi hissa scroll hota hai */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <h3 className="text-xl font-bold leading-snug text-slate-900">
            {task.title}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TaskBadge value={task.priority || "Medium"} variant="priority" />
            <TaskBadge value={task.status} />
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-slate-500">Description</p>

            {task.description ? (
              /*
              | whitespace-pre-wrap — user ke daale hue line break waise hi
              | dikhein. break-words isliye ki bina space wali lambi string
              | modal ko chaudā na kar de.
              */
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                {task.description}
              </p>
            ) : (
              <p className="mt-1.5 text-sm italic text-slate-400">
                No description added.
              </p>
            )}
          </div>

          <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
            {showAssignee && (
              <DetailRow label="Assignee">
                <span className="block truncate font-medium">{name}</span>
              </DetailRow>
            )}

            <DetailRow label="Due date">
              <span
                className={
                  overdue ? "font-semibold text-red-600" : "font-medium"
                }
              >
                {formatDate(task.dueDate)}
              </span>

              {task.dueDate && (
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    overdue ? "text-red-500" : "text-slate-400"
                  }`}
                >
                  {dueLabel(task.dueDate, today)}
                </p>
              )}
            </DetailRow>

            {/* Purane tasks mein createdBy nahi hai — tab dash dikhta hai */}
            <DetailRow label="Assigned by">
              <span className={task.createdBy ? "font-medium" : "text-slate-400"}>
                {task.createdBy || "—"}
              </span>
            </DetailRow>

            <DetailRow label="Created">
              <span className="text-slate-600">
                {formatTimestamp(task.createdAt)}
              </span>
            </DetailRow>

            {/* Purane tasks mein updatedAt na ho to row dikhti hi nahi */}
            {task.updatedAt && (
              <DetailRow label="Last updated">
                <span className="text-slate-600">
                  {formatTimestamp(task.updatedAt)}
                </span>
              </DetailRow>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailsModal;
