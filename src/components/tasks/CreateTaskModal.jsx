import { useEffect, useMemo } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import {
  DESCRIPTION_LIMIT,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  PRIORITIES,
  PRIORITY_DOTS,
} from "../../utils/tasks/taskConstants";
import { fieldClass, todayInputValue } from "../../utils/tasks/taskUtils";
import SearchableSelect from "../common/SearchableSelect";
import TaskSelect from "./TaskSelect";

// Har priority ke saath uska rang — wahi jo table ke badge par dikhta hai
const PRIORITY_OPTIONS = PRIORITIES.map((priority) => ({
  value: priority,
  label: priority,
  dot: PRIORITY_DOTS[priority],
}));

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

function Field({ label, error, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function CreateTaskModal({
  open,
  isEdit = false,
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

  if (!open) return null;

  const noEmployees = !selfAssign && !employees.length;
  const remaining = DESCRIPTION_LIMIT - formData.description.length;

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
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {isEdit ? <Pencil size={19} /> : <Plus size={20} />}
            </div>

            <div>
              <h2
                id="create-task-title"
                className="text-lg font-semibold text-slate-900"
              >
                {isEdit ? "Edit task" : "Create task"}
              </h2>
              <p className="text-sm text-slate-500">
                {isEdit
                  ? "Update the details and save your changes."
                  : selfAssign
                    ? "Add a task to your own list."
                    : "Assign a clear owner and deadline."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* Body — lamba form ho to sirf yahi scroll hota hai */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
                  : "text-slate-400"
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
            <Field label="Assign to" error={errors.assignedTo}>
              <SearchableSelect
                options={employeeOptions}
                value={formData.assignedTo}
                onChange={(next) => onChange("assignedTo", next)}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Due date" error={errors.dueDate}>
              <input
                type="date"
                // Edit mein purani due date wala task bhi khul sakta hai,
                // isliye tab min nahi lagate
                min={isEdit ? undefined : todayInputValue()}
                value={formData.dueDate}
                onChange={(event) => onChange("dueDate", event.target.value)}
                className={`${fieldClass(errors.dueDate)} cursor-pointer`}
              />
            </Field>

            <Field label="Priority">
              <TaskSelect
                options={PRIORITY_OPTIONS}
                value={formData.priority}
                onChange={(next) => onChange("priority", next)}
                ariaLabel="Priority"
                className={`${INPUT_CLASS} cursor-pointer`}
              />
            </Field>
          </div>

          {noEmployees && (
            <p className="text-center text-xs text-amber-600">
              Add an employee before assigning a task.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
              ? isEdit
                ? "Saving..."
                : "Creating..."
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
