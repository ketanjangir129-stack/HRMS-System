import { useEffect } from "react";
import { X } from "lucide-react";
import {
  DESCRIPTION_LIMIT,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  PRIORITIES,
} from "../../utils/tasks/taskConstants";
import { fieldClass, todayInputValue } from "../../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| Task Form Modal
|--------------------------------------------------------------------------
| Create aur Edit dono ke liye ek hi modal — sirf heading aur button ka
| text badalta hai. isEdit se tay hota hai kaunsa.
|
| Form dikhata hai. Validation aur Firebase ka kaam page karta hai —
| ye sirf badalne par onChange, aur submit par onSubmit bula deta hai.
|--------------------------------------------------------------------------
*/

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

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
    >
      {/* Andar click karne par modal band na ho */}
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="create-task-title"
              className="text-xl font-bold text-slate-900"
            >
              {isEdit ? "Edit task" : "Create task"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEdit
                ? "Update the details and save your changes."
                : "Assign a clear owner and deadline."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <Field label="Task title" error={errors.title}>
            <input
              value={formData.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="e.g. Review monthly attendance"
              className={fieldClass(errors.title)}
            />
          </Field>

          <Field label="Description (optional)" error={errors.description}>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="What exactly needs to be done?"
              className={`${fieldClass(errors.description)} h-auto py-2`}
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-400">
              {formData.description.length}/{DESCRIPTION_LIMIT}
            </span>
          </Field>

          <Field label="Assign to" error={errors.assignedTo}>
            <select
              value={formData.assignedTo}
              onChange={(event) => onChange("assignedTo", event.target.value)}
              className={`${fieldClass(errors.assignedTo)} cursor-pointer`}
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.id})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
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
              <select
                value={formData.priority}
                onChange={(event) => onChange("priority", event.target.value)}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !employees.length}
            className={PRIMARY_BUTTON_CLASS}
          >
            {saving
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save changes"
                : "Create task"}
          </button>
        </div>

        {!employees.length && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Add an employee before assigning a task.
          </p>
        )}
      </div>
    </div>
  );
}

export default CreateTaskModal;
