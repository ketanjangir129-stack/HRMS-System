import { useEffect, useMemo, useState } from "react";
import { FiChevronRight, FiEdit2, FiInfo, FiPlus, FiTrash2 } from "react-icons/fi";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  formatDate,
  formatDay,
  formatEstimate,
  formatTime,
  formatTimestamp,
  personName,
  STEP_STATUSES,
  stepStartedAt,
  stepStatusOf,
  stepTimeMs,
  todayInputValue,
} from "../../utils/tasks/taskUtils";
import SearchableSelect from "../common/SearchableSelect";
import TaskSelect from "./TaskSelect";

/*
|--------------------------------------------------------------------------
| Task Subtasks (Steps)
|--------------------------------------------------------------------------
| Task ke andar ke chhote kaam. Har step par ek hi cheez badalni hoti hai —
| uska status — aur wahi timer bhi hai:
|
|   To Do        abhi shuru nahi
|   In Progress  timer chalta hai (pichhla kaam server khud rokta hai)
|   Paused       timer ruka, step adhoora
|   Done         timer ruka, step poora
|
| Alag Start/Stop button nahi — ek control, ek matlab.
|
| Kaun kya kar sakta hai, server batata hai — canTick (status), canStart
| (apna ya bina person wala step — In Progress par timer isi ka chalega),
| canEdit (hatana), aur list ke saath canAdd.
|--------------------------------------------------------------------------
*/

const TITLE_LIMIT = 150;

const STEP_DOTS = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Paused: "bg-orange-500",
  Done: "bg-emerald-500",
};

const STEP_PILLS = {
  "To Do": "bg-slate-50 text-slate-700 ring-slate-200",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-200",
  Paused: "bg-orange-50 text-orange-700 ring-orange-200",
  Done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const STATUS_OPTIONS = STEP_STATUSES.map((status) => ({
  value: status,
  label: status,
  dot: STEP_DOTS[status],
}));

const FIELD = "h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand";

function StepPill({ status, withCaret = false }) {
  return (
    <span
      className={`inline-flex w-28 items-center justify-between gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STEP_PILLS[status]}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${STEP_DOTS[status]}`} />
        {status}
      </span>
      {withCaret && <span className="opacity-60">▾</span>}
    </span>
  );
}

function StepFact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 wrap-break-word text-ink-muted">{children}</dd>
    </div>
  );
}

/*
| Ghante mein likha andaza (1.5) → minute. Khaali = 0 (andaza nahi).
| null = galat value — form wahi rok deta hai.
*/
const hoursToMinutes = (value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 200) return null;
  return Math.round(hours * 60);
};

/*
| Step badlo — naam, kiska, kab tak, andaza. Details khol kar "Edit".
| Sirf jo badla wahi server ko jaata hai; kuch na badla to bas band.
|
| Purani due date beet chuki ho to wahi rakh sakte ho (server bhi yahi
| maanta hai), nayi chunni ho to aaj ya aage ki.
*/
function StepEditForm({ subtask, options, assignees, onLoadAssignees, names, onSave, onCancel }) {
  const [title, setTitle] = useState(subtask.title || "");
  const [assignedTo, setAssignedTo] = useState(subtask.assignedTo || "");
  const [dueDate, setDueDate] = useState(subtask.dueDate || "");
  const [estimate, setEstimate] = useState(
    subtask.estimateMinutes ? String(Math.round((subtask.estimateMinutes / 60) * 100) / 100) : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onLoadAssignees?.();
  }, [onLoadAssignees]);

  const today = todayInputValue();
  const minDate = subtask.dueDate && subtask.dueDate < today ? subtask.dueDate : today;
  const joining = assignedTo !== (subtask.assignedTo || "") &&
    assignees?.others.some((person) => person.id === assignedTo);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!title.trim()) {
      toast.error("Step title is required.");
      return;
    }

    const minutes = hoursToMinutes(estimate);
    if (minutes === null) {
      toast.error("Estimate must be between 0.1 and 200 hours.");
      return;
    }

    const changes = {};
    if (title.trim() !== subtask.title) changes.title = title.trim();
    if (assignedTo !== (subtask.assignedTo || "")) changes.assignedTo = assignedTo;
    if (dueDate !== (subtask.dueDate || "")) changes.dueDate = dueDate;
    if (minutes !== (subtask.estimateMinutes || 0)) changes.estimateMinutes = minutes;

    if (!Object.keys(changes).length) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const result = await onSave(subtask, changes);
      toast.success(
        result?.joined
          ? `Step updated. ${names[assignedTo] || "They"} joined the task.`
          : "Step updated."
      );
      onCancel();
    } catch (error) {
      toast.error(error.message || "Unable to update the step.");
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      // Escape sirf form band kare, poora drawer nahi
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
      className="space-y-2 px-3 pb-3 pl-8"
    >
      <input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))}
        aria-label="Step title"
        placeholder="Step title"
        className={FIELD}
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <SearchableSelect
          options={options}
          value={assignedTo}
          onChange={(next) => setAssignedTo(next || "")}
          placeholder={assignees ? "For: anyone on the team" : "Loading people…"}
          searchPlaceholder="Search people..."
          emptyMessage="No one you can assign"
          ariaLabel="Step for"
          allowClear
          className={`${FIELD} cursor-pointer text-left`}
        />

        <input
          type="date"
          value={dueDate}
          min={minDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="Step due date"
          className={`${FIELD} cursor-pointer`}
        />

        <input
          type="number"
          min="0.1"
          max="200"
          step="0.5"
          value={estimate}
          onChange={(event) => setEstimate(event.target.value)}
          placeholder="Estimate (hours)"
          aria-label="Estimate in hours"
          className={FIELD}
        />
      </div>

      {joining && (
        <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-subtle">
          <FiInfo className="mt-0.5 shrink-0" size={13} />
          {names[assignedTo] || "This person"} will be added to the task team and notified.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="ui-btn ui-btn-ghost h-8 px-3 text-xs">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="ui-btn ui-btn-primary h-8 px-3 text-xs">
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}

function TaskSubtasks({
  subtasks = [],
  // Steps abhi aa rahe hain — khaali jagah ki jagah placeholder
  loading = false,
  // Time ke sessions — purane steps (bina startedAt) ki shuru ki tareekh inse
  sessions = [],
  names = {},
  myEmployeeId,
  // Main is task par hoon — tab person na chunu to step mera hi banta hai
  meOnTask = false,
  now,
  canAdd = false,
  archived = false,
  assignees,
  onLoadAssignees,
  onAdd,
  onStatus,
  onStart,
  onEdit,
  onDelete,
}) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimate, setEstimate] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // Kaunsa step khula hai — poora naam aur saari jaankari
  const [openId, setOpenId] = useState(null);
  // Kaunsa step badla ja raha hai — ek waqt par ek
  const [editingId, setEditingId] = useState(null);

  const done = subtasks.filter((subtask) => stepStatusOf(subtask) === "Done").length;
  const percent = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
  const estimatedTotal = subtasks.reduce((sum, subtask) => sum + (subtask.estimateMinutes || 0), 0);
  const spentTotal = subtasks.reduce((sum, subtask) => sum + stepTimeMs(subtask, now), 0);

  const options = useMemo(() => {
    if (!assignees) return [];
    return [
      ...assignees.onTask.map((person) => ({
        value: person.id,
        label: `${person.name} · ${person.isOwner ? "Assigned to" : "On this task"}`,
      })),
      ...assignees.others.map((person) => ({
        value: person.id,
        label: `${person.name}${person.department ? ` · ${person.department}` : ""} · joins the task`,
      })),
    ];
  }, [assignees]);

  const joining = assignees?.others.some((person) => person.id === assignedTo);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || saving) return;

    // Ghante mein likha (1.5) — server minute leta hai
    const hours = Number(estimate);
    if (estimate && (!Number.isFinite(hours) || hours <= 0 || hours > 200)) {
      toast.error("Estimate must be between 0.1 and 200 hours.");
      return;
    }

    setSaving(true);
    try {
      const result = await onAdd({
        title: title.trim(),
        assignedTo,
        dueDate,
        estimateMinutes: estimate ? Math.round(hours * 60) : 0,
      });
      if (result?.joined) {
        toast.success(`Step added. ${names[assignedTo] || "They"} joined the task.`);
      }
      setTitle("");
      setAssignedTo("");
      setDueDate("");
      setEstimate("");
    } catch (error) {
      toast.error(error.message || "Unable to add the step.");
    } finally {
      setSaving(false);
    }
  };

  /*
  | Status badla. "In Progress" aur step mera (ya kisi ka nahi) — timer
  | shuru (server pichhla kaam rokta hai). Baaki har badlaav sirf status;
  | Paused / Done / To Do par server is step ka timer rok deta hai.
  */
  /*
  | Spinner nahi — naya status turant dikhta hai (useTaskDetails), server
  | peeche se. Galti aaye to toast, aur list asli haal par laut aati hai.
  */
  const changeStatus = async (subtask, next) => {
    if (next === stepStatusOf(subtask)) return;

    try {
      if (next === "In Progress" && subtask.canStart) await onStart(subtask);
      else await onStatus(subtask, next);
    } catch (error) {
      toast.error(error.message || "Unable to update the step.");
    }
  };

  const remove = async (subtask) => {
    setBusyId(subtask.id);
    try {
      await onDelete(subtask);
    } catch (error) {
      toast.error(error.message || "Unable to remove the step.");
    } finally {
      setBusyId(null);
    }
  };

  // Drawer khulte hi "Steps" ki jagah dikhe — baad mein achanak na kood aaye
  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading steps" className="space-y-3">
        <h3 className="text-sm font-bold text-ink">Steps</h3>
        <div className="divide-y divide-line-subtle rounded-xl border border-line">
          {[0, 1].map((key) => (
            <div key={key} className="flex items-center gap-3 px-3 py-3">
              <div className="h-3.5 flex-1 animate-pulse rounded bg-surface-raised" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-surface-raised" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!subtasks.length && (!canAdd || archived)) return null;

  return (
    <section aria-labelledby="task-steps-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="task-steps-title" className="text-sm font-bold text-ink">
          Steps
        </h3>
        {subtasks.length > 0 && (
          <span className="text-xs text-ink-subtle tabular-nums">
            {done} of {subtasks.length} done · {formatTime(spentTotal)}
            {estimatedTotal > 0 && ` of ${formatEstimate(estimatedTotal)}`}
          </span>
        )}
      </div>

      {subtasks.length > 0 && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          {!archived && (
            <p className="text-xs text-ink-faint">
              Set a step to <b className="font-semibold text-blue-700">In Progress</b> to start its
              timer. <b className="font-semibold text-orange-700">Paused</b> or{" "}
              <b className="font-semibold text-emerald-700">Done</b> stops it.
            </p>
          )}
        </>
      )}

      {subtasks.length > 0 && (
        <ul className="divide-y divide-line-subtle rounded-xl border border-line">
          {/* Column ke naam — sirf badi screen par, jahan columns hain */}
          <li
            aria-hidden="true"
            className="hidden items-center gap-3 rounded-t-xl bg-surface-muted px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint sm:flex"
          >
            <span className="flex-1">Step</span>
            <span className="w-28">Status</span>
            <span className="w-28">Dates</span>
            <span className="w-20 text-right">Time</span>
            <span className="w-7" />
          </li>

          {subtasks.map((subtask) => {
            const status = stepStatusOf(subtask);
            const spent = stepTimeMs(subtask, now);
            const running = Object.keys(subtask.workingBy || {}).length > 0;
            const mine = Boolean(myEmployeeId && subtask.workingBy?.[myEmployeeId]);
            const over = subtask.estimateMinutes && spent > subtask.estimateMinutes * 60000;
            const busy = busyId === subtask.id;
            const expanded = openId === subtask.id;
            const editing = expanded && editingId === subtask.id;
            const canChange = !archived && (subtask.canTick || subtask.canStart);
            const startedAt = stepStartedAt(subtask, sessions);
            const doneAt = status === "Done" ? subtask.doneAt : null;

            /*
            | Shuru → khatam. Chal raha ho to "→ …", poora ho to dono
            | tareekh. Shuru hi nahi hua to bas "Not started".
            */
            const dates = startedAt
              ? `${formatDay(startedAt)} → ${doneAt ? formatDay(doneAt) : "…"}`
              : doneAt
                ? `Done ${formatDay(doneAt)}`
                : "";
            const datesTitle = [
              startedAt && `Started ${formatTimestamp(startedAt)}`,
              doneAt && `Done ${formatTimestamp(doneAt)}`,
            ]
              .filter(Boolean)
              .join("\n");

            return (
              /*
              | Ek line: naam · status · tareekh · waqt. Kiska aur kab tak
              | naam ke neeche chhota likha — padhne mein pehle naam hi aaye.
              */
              <li key={subtask.id} className={`group ${expanded ? "bg-surface-muted/60" : ""}`}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Naam dabao — step khulta hai (poora naam + saari jaankari) */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(expanded ? null : subtask.id);
                      // Doosra step khula ya band hua — adhoora edit chhod do
                      setEditingId(null);
                    }}
                    aria-expanded={expanded}
                    title={expanded ? "Hide details" : "Show full step"}
                    className="min-w-0 flex-1 cursor-pointer rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span
                      className={`flex items-start gap-1.5 text-sm font-medium ${
                        status === "Done" ? "text-ink-faint" : "text-ink"
                      }`}
                    >
                      <FiChevronRight
                        size={14}
                        className={`mt-0.5 shrink-0 text-ink-faint transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                      <span className={`min-w-0 ${expanded ? "wrap-break-word" : "truncate"}`}>
                        {subtask.title}
                      </span>
                    </span>

                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 pl-5 text-xs text-ink-faint">
                      <span>{subtask.assignedTo ? personName(subtask.assignedTo, names) : "Anyone on the team"}</span>

                      {subtask.dueDate && status !== "Done" && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={subtask.dueDate < todayInputValue() ? "font-semibold text-red-600" : ""}>
                            Due {formatDate(subtask.dueDate)}
                          </span>
                        </>
                      )}

                      {/* Chhoti screen par Dates column nahi — tareekh yahin */}
                      {dates && (
                        <span className="sm:hidden">
                          <span aria-hidden="true" className="mr-2">·</span>
                          {dates}
                        </span>
                      )}
                    </span>
                  </button>

                  <span className="shrink-0">
                    {canChange ? (
                      <TaskSelect
                        options={STATUS_OPTIONS}
                        value={status}
                        onChange={(next) => changeStatus(subtask, next)}
                        disabled={busy}
                        ariaLabel={`Status of step ${subtask.title}`}
                        className="inline-flex cursor-pointer items-center rounded-full leading-none transition-all hover:shadow-sm hover:ring-2 hover:ring-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        trigger={<StepPill status={status} withCaret />}
                      />
                    ) : (
                      <StepPill status={status} />
                    )}
                  </span>

                  <span
                    title={datesTitle || undefined}
                    className={`hidden w-28 shrink-0 whitespace-nowrap text-xs tabular-nums sm:block ${
                      dates ? (doneAt ? "text-emerald-700" : "text-ink-muted") : "text-ink-faint"
                    }`}
                  >
                    {dates || "Not started"}
                  </span>

                  <span
                    title={running ? (mine ? "Your timer is running" : "Timer running") : undefined}
                    className={`inline-flex w-20 shrink-0 items-center justify-end gap-1.5 text-xs tabular-nums ${
                      over ? "font-semibold text-amber-700" : running ? "font-semibold text-emerald-700" : "text-ink-subtle"
                    }`}
                  >
                    {running && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />}
                    {formatTime(spent)}
                    {subtask.estimateMinutes ? ` / ${formatEstimate(subtask.estimateMinutes)}` : ""}
                  </span>

                  {/* Jagah pehle se rakhi — hover par button aaye to line na hile */}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                    {busy ? (
                      <Loader2 size={14} className="animate-spin text-ink-faint" />
                    ) : (
                      subtask.canEdit &&
                      !archived && (
                        <button
                          type="button"
                          onClick={() => remove(subtask)}
                          aria-label={`Remove step "${subtask.title}"`}
                          className="ui-icon-btn h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )
                    )}
                  </span>
                </div>

                {expanded && editing && (
                  <StepEditForm
                    subtask={subtask}
                    options={options}
                    assignees={assignees}
                    onLoadAssignees={onLoadAssignees}
                    names={names}
                    onSave={onEdit}
                    onCancel={() => setEditingId(null)}
                  />
                )}

                {expanded && !editing && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 pb-3 pl-8 text-xs sm:grid-cols-3">
                    <StepFact label="For">
                      {subtask.assignedTo ? personName(subtask.assignedTo, names) : "Anyone on the team"}
                    </StepFact>
                    <StepFact label="Due">{subtask.dueDate ? formatDate(subtask.dueDate) : "—"}</StepFact>
                    <StepFact label="Estimate">
                      {subtask.estimateMinutes ? formatEstimate(subtask.estimateMinutes) : "—"}
                    </StepFact>
                    <StepFact label="Started">{startedAt ? formatTimestamp(startedAt) : "Not started"}</StepFact>
                    <StepFact label="Done">
                      {doneAt
                        ? `${formatTimestamp(doneAt)}${subtask.doneBy ? ` · ${subtask.doneBy}` : ""}`
                        : "—"}
                    </StepFact>
                    <StepFact label="Time spent">{formatTime(spent)}</StepFact>
                    {/* Apne liye khud joda ho to "For" hi kaafi — wahi naam dobara nahi */}
                    {subtask.createdById && subtask.createdById !== subtask.assignedTo && (
                      <StepFact label="Added by">
                        {personName(subtask.createdById, names)}
                        {subtask.createdAt ? ` · ${formatDay(subtask.createdAt)}` : ""}
                      </StepFact>
                    )}

                    {/* Badalne ka haq server batata hai (canEdit) */}
                    {subtask.canEdit && !archived && onEdit && (
                      <div className="col-span-full flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingId(subtask.id)}
                          className="ui-btn ui-btn-ghost h-8 px-3 text-xs"
                        >
                          <FiEdit2 size={13} />
                          Edit step
                        </button>
                      </div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/*
        Jodna — naam likho, Enter dabao, ho gaya. Person, date, andaza
        optional hain aur naam likhte hi neeche ek line mein aate hain.
      */}
      {canAdd && !archived && (
        <form onSubmit={submit} className="space-y-2" onFocus={onLoadAssignees}>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-1.5 focus-within:border-brand focus-within:ring-3 focus-within:ring-brand-ring">
            <FiPlus className="shrink-0 text-brand" size={15} />
            <input
              id="task-step-title"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, TITLE_LIMIT))}
              placeholder="Add a step and press Enter"
              aria-label="New step"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            {title.trim() && (
              <button type="submit" disabled={saving} className="ui-btn ui-btn-primary h-8 px-3 text-xs">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Add
              </button>
            )}
          </div>

          {title.trim() && (
            <div className="grid gap-2 sm:grid-cols-3">
              <SearchableSelect
                options={options}
                value={assignedTo}
                onChange={(next) => setAssignedTo(next || "")}
                placeholder={assignees ? (meOnTask ? "For: you" : "For: anyone") : "Loading people…"}
                searchPlaceholder="Search people..."
                emptyMessage="No one you can assign"
                ariaLabel="Step for"
                allowClear
                className={`${FIELD} cursor-pointer text-left`}
              />

              <input
                type="date"
                value={dueDate}
                min={todayInputValue()}
                onChange={(event) => setDueDate(event.target.value)}
                aria-label="Step due date"
                className={`${FIELD} cursor-pointer`}
              />

              <input
                type="number"
                min="0.1"
                max="200"
                step="0.5"
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                placeholder="Estimate (hours)"
                aria-label="Estimate in hours"
                className={FIELD}
              />
            </div>
          )}

          {joining && (
            <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-subtle">
              <FiInfo className="mt-0.5 shrink-0" size={13} />
              {names[assignedTo] || "This person"} will be added to the task team and notified.
            </p>
          )}
        </form>
      )}
    </section>
  );
}

export default TaskSubtasks;
