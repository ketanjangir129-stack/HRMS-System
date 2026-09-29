import { useMemo, useState } from "react";
import { FiFileText, FiLoader, FiX } from "react-icons/fi";
import SearchableSelect from "../../common/SearchableSelect";
import { REQUEST_TYPES } from "../../../utils/attendance/attendanceConstants";
import {
  getLastCorrectableDate,
  toTimeInputValue,
} from "../../../utils/attendance/attendanceDate";
import {
  getInitialRequestForm,
  getRequestType,
  toRequestForm,
  toRequestPayload,
  validateRequestForm,
} from "../../../utils/attendance/attendanceRequestUtils";

/*
|--------------------------------------------------------------------------
| Attendance Request Modal
|--------------------------------------------------------------------------
| Creates and edits a request. The request stores the employee id only, so
| the form never asks for a name or a department: those are resolved from the
| employees collection wherever the request is displayed.
|--------------------------------------------------------------------------
*/

const fieldClass =
  "ui-field";

const labelClass =
  "ui-eyebrow mb-1.5 block";

function Field({ label, error, required, className = "", children }) {
  return (
    <div className={className}>

      <label className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      )}

    </div>
  );
}

function RequestForm({
  onClose,
  onSubmit,
  submitting = false,
  initialData = null,
  currentUser = null,
  employees = [],
  canSelectEmployee = false,
  title = "New Attendance Request",
  subtitle = "Raise an attendance correction request",
}) {

  const [form, setForm] = useState(() =>
    initialData
      ? toRequestForm(initialData, toTimeInputValue)
      : getInitialRequestForm(currentUser)
  );

  const [errors, setErrors] = useState({});

  const setField = (name, value) => {

    setForm((previous) => ({ ...previous, [name]: value }));

    // Clear the field error as the user types.
    setErrors((previous) =>
      previous[name] ? { ...previous, [name]: "" } : previous
    );

  };

  const handleChange = (event) =>
    setField(event.target.name, event.target.value);

  /*
  | The employee list grows with the company, so it is searched rather than
  | scrolled. Name and id both sit in the label and stay searchable.
  */
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.employeeId,
        label: `${employee.name} (${employee.employeeId})`,
      })),
    [employees]
  );

  const handleSubmit = (event) => {

    event.preventDefault();

    const nextErrors = validateRequestForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit(toRequestPayload(form));

  };

  const selectedType = getRequestType(form.type);

  const requires = selectedType?.requires;

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`.
    | The header and footer are pinned and only the fields scroll, so the
    | keyboard never pushes Submit off the screen.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiFileText size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="ui-card-title truncate">
                {title}
              </h2>
              <p className="truncate text-sm text-ink-subtle">{subtitle}</p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="ui-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

              <Field
                label="Employee"
                error={errors.employeeId}
                required
              >
                {canSelectEmployee && !initialData ? (
                  <SearchableSelect
                    options={employeeOptions}
                    value={form.employeeId}
                    onChange={(employeeId) =>
                      setField("employeeId", employeeId)
                    }
                    placeholder="Select employee..."
                    searchPlaceholder="Search by name or ID..."
                    emptyMessage="No employees found"
                    ariaLabel="Select employee"
                    allowClear
                    className={`${fieldClass} cursor-pointer`}
                  />
                ) : (
                  <input
                    type="text"
                    name="employeeId"
                    value={form.employeeId}
                    readOnly
                    disabled
                    className={fieldClass}
                  />
                )}
              </Field>

              <Field label="Date" error={errors.date} required>
                {/* Today is still in progress, so corrections stop at yesterday. */}
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  max={getLastCorrectableDate()}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </Field>

              <Field
                label="Request Type"
                error={errors.type}
                required
                className="sm:col-span-2"
              >
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className={`${fieldClass} cursor-pointer`}
                >
                  <option value="">Select type...</option>
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {selectedType && (
                  <p className="mt-1.5 text-xs text-ink-subtle">
                    {selectedType.description}
                  </p>
                )}
              </Field>

              <Field
                label="Requested Punch In"
                error={errors.requestedPunchIn}
                required={requires === "punchIn" || requires === "both"}
              >
                <input
                  type="time"
                  name="requestedPunchIn"
                  value={form.requestedPunchIn}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </Field>

              <Field
                label="Requested Punch Out"
                error={errors.requestedPunchOut}
                required={requires === "punchOut" || requires === "both"}
              >
                <input
                  type="time"
                  name="requestedPunchOut"
                  value={form.requestedPunchOut}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </Field>

              <Field
                label="Reason"
                error={errors.reason}
                required
                className="sm:col-span-2"
              >
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Explain why this correction is needed..."
                  value={form.reason}
                  onChange={handleChange}
                  className={`${fieldClass} resize-none`}
                />
              </Field>

            </div>

          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="ui-btn ui-btn-secondary font-semibold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="ui-btn ui-btn-primary font-semibold"
            >
              {submitting && <FiLoader className="animate-spin" />}
              {submitting
                ? "Saving..."
                : initialData
                  ? "Save Changes"
                  : "Submit Request"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );

}

/*
| The form only exists while the modal is open and is re-created whenever a
| different request is edited, so it can never show the previous values.
*/

function AttendanceRequestModal({ open, initialData = null, ...props }) {

  if (!open) return null;

  return (
    <RequestForm
      key={initialData?.requestId || "new"}
      initialData={initialData}
      {...props}
    />
  );

}

export default AttendanceRequestModal;
