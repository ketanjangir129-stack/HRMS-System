import { useEffect, useMemo } from "react";
import { Loader2, Pencil, Plus, Users, X } from "lucide-react";
import {
  DESCRIPTION_LIMIT,
  PRIMARY_BUTTON_CLASS,
  PRIORITIES,
  PRIORITY_DOTS,
} from "../../utils/tasks/taskConstants";
import { fieldClass, todayInputValue } from "../../utils/tasks/taskUtils";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import SearchableSelect from "../common/SearchableSelect";
import { Avatar } from "./PeopleStack";

// Aaj se n din aage — date chips ke liye
const daysFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getDateKey(date);
};

const QUICK_DATES = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "Next week", days: 7 },
];

/*
| Priority teen hi hain — dropdown ki jagah ek segmented control. Chuna hua
| hissa card jaisa uthta hai aur apne rang mein likha jaata hai; baaki
| halke rehte hain.
*/
const PRIORITY_ON = {
  High: "bg-surface text-red-700 shadow-sm ring-1 ring-red-200",
  Medium: "bg-surface text-amber-700 shadow-sm ring-1 ring-amber-200",
  Low: "bg-surface text-slate-700 shadow-sm ring-1 ring-slate-200",
};

// Segmented control ka dabba aur uske button — date chips aur priority dono
const SEGMENT_GROUP = "grid h-11 grid-cols-3 gap-1 rounded-xl bg-surface-raised p-1";
const SEGMENT_BUTTON =
  "flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

/*
|--------------------------------------------------------------------------
| Task Form Modal
|--------------------------------------------------------------------------
| Create aur Edit dono ke liye ek hi modal — sirf heading, icon aur button
| ka text badalta hai. isEdit se tay hota hai kaunsa.
|
| Form dikhata hai. Validation aur Firebase ka kaam page karta hai — ye
| sirf badalne par onChange, aur submit par onSubmit bula deta hai.
|
| Layout DeleteTaskModal/TaskDetailsModal jaisa: header aur footer tike
| rehte hain, sirf beech ka hissa scroll hota hai.
|--------------------------------------------------------------------------
*/

// Counter itne characters bache hone par amber ho jaata hai
const DESCRIPTION_WARN_AT = 50;

/*
| group: andar kai button hon (team chips, priority) to <label> nahi, <div>
| — label ke text par click uske pehle button ko "daba" deta hai, aur
| "Team members" likha dabane se pehla member hat jaata.
*/
function Field({ label, error, children, group = false }) {
  const Tag = group ? "div" : "label";

  return (
    <Tag className="block text-sm font-semibold text-ink-muted">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </Tag>
  );
}

function CreateTaskModal({
  open,
  isEdit = false,
  /*
  | "members" — sirf team badalna (drawer ka "add people" button). Baaki
  | fields chhupi rehti hain, kyunki jise sirf team badalne ka haq hai use
  | title-date badalne ka haq nahi bhi ho sakta.
  */
  mode = "form",
  // Doosron ko team mein jodne ka haq (tasks.create)
  canAddMembers = false,
  formData,
  errors,
  employees,
  /*
  | Task khud ke naam par ban raha hai — tab assignee ki koi choice nahi
  | hoti, isliye field render hi nahi karte. ApplyLeaveModal bhi aisa hi
  | hai: usme employee selector hai hi nahi.
  |
  | Aisi surat mein employees list bhi nahi aati (page wo call skip karta
  | hai), isliye submit ko us list par nahi rokte.
  */
  selfAssign = false,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  // Modal khula ho to peeche ka page scroll na ho, aur Escape se band ho jaye
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Save chalte waqt band nahi hona chahiye — write beech mein hai
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, onClose]);

  /*
  | Employee list company ke saath badhti hai — 200 naam wale native select
  | mein scroll karna bekaar hai. SearchableSelect mein type karke dhoondte
  | hain. Naam aur id dono label mein hain, to dono se search chalti hai —
  | wahi tarika AttendanceRequestModal bhi use karta hai.
  */
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.id,
        label: `${employee.name} (${employee.id})`,
      })),
    [employees]
  );

  // Team ke liye wahi log jo owner nahi hain aur abhi chune nahi gaye
  const members = useMemo(() => formData.members || [], [formData.members]);
  const memberOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee.id !== formData.assignedTo && !members.includes(employee.id))
        .map((employee) => ({ value: employee.id, label: `${employee.name} (${employee.id})` })),
    [employees, formData.assignedTo, members]
  );
  const employeeNames = useMemo(
    () => Object.fromEntries(employees.map((employee) => [employee.id, employee.name])),
    [employees]
  );

  if (!open) return null;

  const membersOnly = mode === "members";
  const noEmployees = !selfAssign && !employees.length;
  const remaining = DESCRIPTION_LIMIT - formData.description.length;

  const teamField = canAddMembers && !selfAssign && (
    <Field group label={membersOnly ? "People on this task" : "Team members (optional)"} error={errors.members}>
      {members.length > 0 && (
        <span className="mb-2 flex flex-wrap gap-1.5">
          {members.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised py-0.5 pl-0.5 pr-1.5 text-xs font-semibold text-ink-muted"
            >
              <Avatar id={id} names={employeeNames} size="xs" />
              {employeeNames[id] || id}
              <button
                type="button"
                onClick={() => onChange("members", members.filter((member) => member !== id))}
                aria-label={`Remove ${employeeNames[id] || id}`}
                className="cursor-pointer rounded-full p-0.5 text-ink-faint hover:bg-surface-muted hover:text-ink"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </span>
      )}
      <SearchableSelect
        options={memberOptions}
        value=""
        onChange={(next) => next && onChange("members", [...members, next])}
        placeholder="Add people…"
        searchPlaceholder="Search by name or ID..."
        emptyMessage="No more people to add"
        ariaLabel="Add team member"
        className={`${fieldClass(errors.members)} cursor-pointer`}
      />
      <span className="mt-1 block text-xs font-normal text-ink-faint">
        Everyone on the team can update status, add steps and comment.
      </span>
    </Field>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      {/* Andar click karne par modal band na ho */}
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="ui-tile ui-tile-sm bg-brand-ring text-brand">
              {membersOnly ? <Users size={19} /> : isEdit ? <Pencil size={19} /> : <Plus size={20} />}
            </div>

            <div>
              <h2 id="create-task-title" className="ui-card-title">
                {membersOnly ? "Task team" : isEdit ? "Edit task" : "Create task"}
              </h2>
              <p className="text-sm text-ink-subtle">
                {membersOnly
                  ? "Add or remove people working on this task."
                  : isEdit
                    ? "Update the details and save your changes."
                    : selfAssign
                      ? "Add a task to your own list."
                      : "Assign a clear owner and deadline. The team is notified."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body — lamba form ho to sirf yahi scroll hota hai */}
        <div className="ui-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {membersOnly ? teamField : (
          <>
          <Field label="Task title" error={errors.title}>
            <input
              // Modal khulte hi cursor yahan — form bharna tez ho jaata hai
              autoFocus
              value={formData.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="e.g. Review monthly attendance"
              className={fieldClass(errors.title)}
            />
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="What exactly needs to be done?"
              className={`${fieldClass(errors.description)} h-auto py-2`}
            />
            <span
              className={`mt-1 block text-right text-xs font-normal ${
                remaining <= DESCRIPTION_WARN_AT
                  ? "text-amber-600"
                  : "text-ink-faint"
              }`}
            >
              {formData.description.length}/{DESCRIPTION_LIMIT}
            </span>
          </Field>

          {selfAssign ? (
            /*
            | Assignee ki choice nahi hai, par khaali chhod dena confusing
            | hoga — isliye saaf likh dete hain kiske naam par jaayega.
            */
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              This task will be assigned to you.
            </p>
          ) : (
            <Field label={canAddMembers ? "Owner" : "Assign to"} error={errors.assignedTo}>
              <SearchableSelect
                options={employeeOptions}
                value={formData.assignedTo}
                onChange={(next) => {
                  onChange("assignedTo", next);
                  // Owner member nahi ho sakta — chuna gaya to team se hata do
                  if (next && members.includes(next)) {
                    onChange("members", members.filter((member) => member !== next));
                  }
                }}
                placeholder="Select an employee"
                searchPlaceholder="Search by name or ID..."
                emptyMessage="No employees found"
                ariaLabel="Assign to"
                allowClear
                // Trigger ka poora look yahan se aata hai — wahi input class
                // jo baaki fields use karte hain
                className={`${fieldClass(errors.assignedTo)} cursor-pointer`}
              />
            </Field>
          )}

          {/*
            Phone par upar-neeche: 360px screen par modal ki padding ke baad
            har field ~130px ki reh jaati thi, jisme date ka apna calendar
            icon aur uska text dono tang ho jaate the.
          */}
          {teamField}

          {/*
            Due date aur Priority dono apni poori line par — aadhi chaudai
            mein "Medium" kat jaata tha aur date chips do line mein toot-te
            the. Date ke shortcut input ke bagal mein, usi 44px ki oonchai
            par, taaki ek hi kataar mein seedhe dikhein.
          */}
          <Field group label="Due date" error={errors.dueDate}>
            <span className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                // Edit mein purani due date wala task bhi khul sakta hai,
                // isliye tab min nahi lagate
                min={isEdit ? undefined : todayInputValue()}
                aria-label="Due date"
                value={formData.dueDate}
                onChange={(event) => onChange("dueDate", event.target.value)}
                className={`${fieldClass(errors.dueDate)} min-w-0 cursor-pointer sm:flex-1`}
              />

              <span role="group" aria-label="Quick due dates" className={`${SEGMENT_GROUP} shrink-0`}>
                {QUICK_DATES.map((quick) => {
                  const value = daysFromToday(quick.days);
                  const active = formData.dueDate === value;

                  return (
                    <button
                      key={quick.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange("dueDate", value)}
                      className={`${SEGMENT_BUTTON} text-xs ${
                        active
                          ? "bg-surface text-brand shadow-sm ring-1 ring-blue-200"
                          : "text-ink-subtle hover:bg-surface/60 hover:text-ink"
                      }`}
                    >
                      {quick.label}
                    </button>
                  );
                })}
              </span>
            </span>
          </Field>

          <Field group label="Priority">
            <span role="radiogroup" aria-label="Priority" className={SEGMENT_GROUP}>
              {PRIORITIES.map((priority) => {
                const active = formData.priority === priority;

                return (
                  <button
                    key={priority}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange("priority", priority)}
                    className={`${SEGMENT_BUTTON} ${
                      active ? PRIORITY_ON[priority] : "text-ink-subtle hover:bg-surface/60 hover:text-ink"
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOTS[priority]}`} />
                    {priority}
                  </button>
                );
              })}
            </span>
          </Field>
          </>
          )}

          {noEmployees && (
            <p className="text-center text-xs text-amber-600">
              Add an employee before assigning a task.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ui-btn ui-btn-secondary"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || noEmployees}
            className={PRIMARY_BUTTON_CLASS}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving
              ? isEdit || membersOnly
                ? "Saving..."
                : "Creating..."
              : membersOnly
                ? "Save team"
                : isEdit
                  ? "Save changes"
                  : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTaskModal;
