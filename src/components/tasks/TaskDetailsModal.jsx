import { useEffect } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Eye,
  User,
  UserCheck,
  X,
} from "lucide-react";
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

/*
| Ek jaankari = ek chhota card. Pehle ye "label baayein, value daayein" wali
| rows thin, jisme aankh ko har baar poori chaudai naapni padti thi. Tile
| mein label upar chhota aur value neeche mota hota hai, isliye do-teen
| cheezein ek nazar mein padh li jaati hain.
|
| tone="danger" sirf overdue due date par lagta hai — laal tabhi, jab sach
| mein kuch bigda ho.
*/
function InfoTile({ icon, label, children, tone = "default", className = "" }) {
  const danger = tone === "danger";

  return (
    <div
      className={`${className} flex items-start gap-3 rounded-xl border p-3.5 ${
        danger ? "border-red-200 bg-red-50" : "border-line bg-surface"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger
            ? "bg-red-100 text-red-600"
            : "bg-surface-raised text-ink-subtle"
        }`}
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            danger ? "text-red-500" : "text-ink-faint"
          }`}
        >
          {label}
        </p>
        <div className="mt-0.5 text-sm text-ink-muted">{children}</div>
      </div>
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
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="ui-tile ui-tile-sm bg-brand-ring text-brand">
              <Eye size={20} />
            </div>
            <div>
              <h2 id="task-details-title" className="ui-card-title">
                Task details
              </h2>
              <p className="text-sm text-ink-subtle">View only</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — lambi description par yahi hissa scroll hota hai */}
        <div className="ui-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/*
            Overdue sabse upar apni patti mein. Pehle ye baat sirf due date
            ke laal rang se pata chalti thi, jo neeche scroll karne par hi
            dikhti — jo sabse zaroori khabar hai wo sabse pehle honi chahiye.
          */}
          {overdue && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200">
              <AlertTriangle size={17} className="shrink-0" />
              {dueLabel(task.dueDate, today)}
            </div>
          )}

          <div>
            <h3 className="wrap-break-word text-xl font-bold leading-snug text-ink">
              {task.title}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TaskBadge value={task.priority || "Medium"} variant="priority" />
              <TaskBadge value={task.status} />
            </div>
          </div>

          {/*
            Description ab apne halke box mein hai. Khuli padi thi to title
            aur baaki jaankari ke beech ghul jaati thi — ab saaf dikhta hai
            ki ye user ka likha hua matter hai.
          */}
          <div className="rounded-xl border border-line bg-surface-muted/70 p-4">
            <p className="ui-eyebrow">Description</p>

            {task.description ? (
              /*
              | whitespace-pre-wrap — user ke daale hue line break waise hi
              | dikhein. break-words isliye ki bina space wali lambi string
              | modal ko chaudā na kar de.
              */
              <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-ink-muted">
                {task.description}
              </p>
            ) : (
              <p className="mt-1.5 text-sm italic text-ink-faint">
                No description added.
              </p>
            )}
          </div>

          {/* Do column bade screen par, chhoti par ek ke neeche ek */}
          <div className="grid gap-3 sm:grid-cols-2">
            {showAssignee && (
              <InfoTile icon={<User size={16} />} label="Assignee">
                <span className="block truncate font-semibold">{name}</span>
              </InfoTile>
            )}

            <InfoTile
              icon={<CalendarDays size={16} />}
              label="Due date"
              tone={overdue ? "danger" : "default"}
            >
              <span
                className={`font-semibold ${overdue ? "text-red-700" : ""}`}
              >
                {formatDate(task.dueDate)}
              </span>

              {/* Overdue ki baat upar patti mein aa chuki hai */}
              {task.dueDate && !overdue && (
                <p className="mt-0.5 text-xs font-medium text-ink-faint">
                  {dueLabel(task.dueDate, today)}
                </p>
              )}
            </InfoTile>

            {/*
              Teen tiles do column mein aayein to aakhri ke bagal khaali
              jagah bach jaati hai — isliye Assignee dikh raha ho to ye
              poori chaudai le leta hai.

              Purane tasks mein createdBy nahi hai — tab dash dikhta hai.
            */}
            <InfoTile
              className={showAssignee ? "sm:col-span-2" : ""}
              icon={<UserCheck size={16} />}
              label="Assigned by"
            >
              <span
                className={
                  task.createdBy
                    ? "block truncate font-semibold"
                    : "text-ink-faint"
                }
              >
                {task.createdBy || "—"}
              </span>
            </InfoTile>
          </div>

          {/*
            Timestamps sabse kam kaam ke hain, isliye sabse halke — apni
            tiles ki jagah ek chhoti si line, taaki upar wali jaankari se
            takraayein nahi. Purane tasks mein updatedAt na ho to us hisse
            ko chhod dete hain.
          */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-subtle pt-4 text-xs text-ink-faint">
            <span className="flex items-center gap-1.5">
              <Clock size={13} className="shrink-0" />
              Created {formatTimestamp(task.createdAt)}
            </span>

            {task.updatedAt && (
              <span>Last updated {formatTimestamp(task.updatedAt)}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailsModal;
