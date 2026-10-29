import { useEffect } from "react";
import {
  FiAlertTriangle,
  FiArchive,
  FiCheck,
  FiClock,
  FiEdit2,
  FiPause,
  FiPlay,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import useTaskDetails from "../../hooks/useTaskDetails";
import {
  dueLabel,
  formatDate,
  formatDay,
  formatTime,
  formatTimestamp,
  isOnTask,
  isOverdue,
  isWorkingOn,
  memberIdsOf,
  personName,
  taskStartedAt,
  taskTimeMs,
  todayInputValue,
  workingIdsOf,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";
import TaskSubtasks from "./TaskSubtasks";

/*
|--------------------------------------------------------------------------
| Task Drawer
|--------------------------------------------------------------------------
| Row dabane par daayein se khulta hai — list peeche dikhti rehti hai.
| Pehle do alag modal the (Details aur Activity); ab ek hi jagah:
|
|   upar   : status, priority, title, team ka kaam (Join / Stop), edit, archive
|   status : chaar kadam — dabane se wahi status lag jaata hai (status
|            badalne ka yahi ek raasta, button dobara nahi)
|   jaankari: owner, team, kisne diya, due date, kab shuru / kab poora
|   steps  : subtasks (TaskSubtasks)
|
| Activity, Comments aur Time ke tab nahi rakhe — users ke liye bas shor
| tha. Activity aur sessions ka data phir bhi aata hai: "Started" ki
| tareekh purane tasks par unhi se nikalti hai.
|
| Steps, activity, comments useTaskDetails se aate hain aur khud taaze
| rehte hain. Task khud page ki list se aata hai, isliye wo bhi taaza.
|--------------------------------------------------------------------------
*/

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="ui-eyebrow mb-1">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink-muted">{children}</dd>
    </div>
  );
}

function StatusSteps({ status, disabled, onPick }) {
  const current = TASK_STATUSES.indexOf(status);

  return (
    <div className="flex items-center" role="group" aria-label="Status">
      {TASK_STATUSES.map((step, index) => {
        const reached = index < current;
        const now = index === current;

        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={disabled || now}
              onClick={() => onPick(step)}
              aria-pressed={now}
              title={disabled ? step : `Move to ${step}`}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold transition-colors disabled:cursor-default ${
                now ? "text-brand" : reached ? "text-ink-muted" : "text-ink-faint"
              } ${disabled || now ? "" : "cursor-pointer hover:text-ink"}`}
            >
              <span
                className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                  now
                    ? "border-brand bg-surface ring-3 ring-brand-ring"
                    : reached
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-surface"
                }`}
              >
                {reached && <FiCheck size={10} strokeWidth={3} />}
              </span>
              {step}
            </button>
            {index < TASK_STATUSES.length - 1 && (
              <span className={`mx-2 h-0.5 min-w-3 flex-1 rounded-full ${reached ? "bg-brand" : "bg-line"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TaskDrawer({
  open,
  // Upar koi form/modal khula hai — tab Escape us modal ka hai, drawer ka nahi
  suspended = false,
  task,
  names = {},
  companyCode,
  myEmployeeId,
  // Page ka chalta waqt — timer har kuch second aage badhte hain
  now,
  canChangeStatus = false,
  canEdit = false,
  canArchive = false,
  canManageMembers = false,
  canViewActivity = true,
  onClose,
  onStatusChange,
  onWork,
  onEdit,
  onManageMembers,
  onArchive,
}) {
  const details = useTaskDetails(open ? task?.id : null, { companyCode, canViewActivity, myEmployeeId });

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape" && !suspended) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, suspended, onClose]);

  if (!open || !task) return null;

  const today = todayInputValue();
  const status = task.status || TASK_STATUSES[0];
  const overdue = isOverdue(task, today);
  const allNames = { ...names, ...details.people };
  const onTask = isOnTask(task, myEmployeeId);
  const working = workingIdsOf(task);
  const meWorking = isWorkingOn(task, myEmployeeId);
  const archived = Boolean(task.archivedAt);
  const totalTime = taskTimeMs(task, now);
  const myStep = myEmployeeId ? task.workingStep?.[myEmployeeId] : null;
  const sessions = details.time?.sessions || [];
  const startedAt = taskStartedAt(task, sessions, details.activityEntries);
  // Purane Completed tasks par completedAt nahi — tab aakhri badlaav hi
  const completedAt = status === "Completed" ? task.completedAt || task.updatedAt : null;

  const button = "ui-btn h-9 px-3.5";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-drawer-title"
    >
      <aside
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="space-y-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <TaskBadge value={status} />
            <TaskBadge value={task.priority || "Medium"} variant="priority" />
            {archived && (
              <span className="ui-badge bg-surface-raised text-ink-subtle">Archived</span>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="ui-icon-btn ml-auto">
              <FiX size={19} />
            </button>
          </div>

          <h2 id="task-drawer-title" className="wrap-break-word text-lg font-bold leading-snug text-ink">
            {task.title}
          </h2>

          {/*
            Status yahan button se nahi badalta — neeche ke chaar kadam
            (StatusSteps) hi wo kaam karte hain. Dono rakhne se ek hi kaam do
            jagah tha. Yahan sirf wo hai jo kahin aur nahi: team ka apna kaam
            shuru/band karna, edit aur archive.
          */}
          {!archived && (onTask && status === "In Progress" || canEdit || canArchive) && (
            <div className="flex flex-wrap gap-2">
              {/* Team ke liye: koi aur laga ho to "main bhi" / "main ruk raha" */}
              {onTask && status === "In Progress" && (
                meWorking ? (
                  <button type="button" onClick={() => onWork(task, "stop")} className={`${button} ui-btn-secondary`}>
                    <FiPause size={14} />
                    {working.length > 1 ? "Stop my work" : "Pause"}
                  </button>
                ) : (
                  <button type="button" onClick={() => onWork(task, "start")} className={`${button} ui-btn-secondary`}>
                    <FiPlay size={14} />
                    Join work
                  </button>
                )
              )}

              {canEdit && (
                <button type="button" onClick={() => onEdit(task)} className={`${button} ui-btn-ghost`}>
                  <FiEdit2 size={14} />
                  Edit
                </button>
              )}

              {canArchive && (
                <button type="button" onClick={() => onArchive(task)} className={`${button} ui-btn-ghost hover:text-red-600`}>
                  <FiArchive size={14} />
                  Archive
                </button>
              )}
            </div>
          )}
        </div>

        <div className="ui-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <StatusSteps
            status={status}
            disabled={!canChangeStatus || archived}
            onPick={(next) => onStatusChange(task, next)}
          />

          {overdue && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 ring-1 ring-inset ring-red-200">
              <FiAlertTriangle size={16} className="shrink-0" />
              {dueLabel(task.dueDate, today)}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Sirf naam — initials wale gol nishaan yahan nahi */}
            <Meta label="Assigned to">
              <span className="truncate">{personName(task.assignedTo, allNames)}</span>
            </Meta>

            <Meta label="Team">
              <span className="flex min-w-0 flex-col items-start gap-1.5">
                <span
                  title={memberIdsOf(task).map((id) => personName(id, allNames)).join(", ")}
                  className={`line-clamp-2 ${memberIdsOf(task).length ? "" : "font-medium text-ink-subtle"}`}
                >
                  {memberIdsOf(task).length
                    ? memberIdsOf(task).map((id) => personName(id, allNames)).join(", ")
                    : "No one else yet"}
                </span>
                {/*
                  Manager (ya jiske paas tasks.create hai) yahin se kisi ko bhi
                  task par jod sakta hai. Pehle ye ek chhota icon tha jo dikhta
                  hi nahi tha — ab saaf likha hua button.
                */}
                {canManageMembers && !archived && (
                  <button
                    type="button"
                    onClick={() => onManageMembers(task)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand ring-1 ring-blue-200 transition-colors hover:bg-blue-50"
                  >
                    <FiUserPlus size={13} />
                    Add people
                  </button>
                )}
              </span>
            </Meta>

            <Meta label="Assigned by">
              <span className="truncate">{task.createdBy || "—"}</span>
            </Meta>

            <Meta label="Due date">
              <span className={overdue ? "text-red-600" : ""}>{formatDate(task.dueDate)}</span>
              {task.dueDate && !overdue && status !== "Completed" && (
                <span className="text-xs font-medium text-ink-faint">{dueLabel(task.dueDate, today)}</span>
              )}
            </Meta>

            <Meta label="Started">
              {startedAt ? (
                <span title={formatTimestamp(startedAt)}>{formatDay(startedAt)}</span>
              ) : (
                <span className="font-medium text-ink-faint">Not started</span>
              )}
            </Meta>

            <Meta label="Completed">
              {completedAt ? (
                <span title={formatTimestamp(completedAt)} className="text-emerald-700">
                  {formatDay(completedAt)}
                </span>
              ) : (
                <span className="font-medium text-ink-faint">—</span>
              )}
            </Meta>
          </dl>

          {/* Kaun abhi laga hai, kis step par, aur ab tak kitna waqt */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <FiClock size={14} className="text-ink-faint" />
              {formatTime(totalTime)}
              <span className="font-normal text-ink-subtle">spent</span>
            </span>

            {working.length > 0 && (
              <span className="text-emerald-700">
                <b className="font-semibold">
                  {working.map((id) => (id === myEmployeeId ? "You" : personName(id, allNames))).join(", ")}
                </b>{" "}
                {working.length > 1 ? "are" : "is"} working on this now
                {myStep?.title ? ` · you're on "${myStep.title}"` : ""}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface-muted/70 p-4">
            <p className="ui-eyebrow">Description</p>
            <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-ink-muted">
              {task.description || "No description added."}
            </p>
          </div>

          <TaskSubtasks
            subtasks={details.subtasks}
            loading={!details.stepsLoaded}
            sessions={sessions}
            names={allNames}
            myEmployeeId={myEmployeeId}
            meOnTask={onTask}
            now={now}
            canAdd={details.canAddSubtask}
            archived={archived}
            assignees={details.assignees}
            onLoadAssignees={details.loadAssignees}
            onAdd={details.addStep}
            onStatus={details.setStepStatus}
            onStart={details.startStep}
            onEdit={details.editStep}
            onDelete={details.deleteStep}
          />

          {details.error && <p className="text-xs text-amber-600">{details.error}</p>}

          <p className="border-t border-line-subtle pt-4 text-xs text-ink-faint">
            Created {formatTimestamp(task.createdAt)}
            {task.updatedAt ? ` · Last updated ${formatTimestamp(task.updatedAt)}` : ""}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default TaskDrawer;
