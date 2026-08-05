import { useState } from "react";
import { FiX, FiFileText, FiLoader } from "react-icons/fi";
import {
  REQUEST_TYPES,
  getInitialRequestForm,
} from "../../../utils/attendance/attendanceRequestUtils";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

/*
|--------------------------------------------------------------------------
| Convert stored timestamp to HH:MM for time inputs
|--------------------------------------------------------------------------
*/
const toTimeInputValue = (value) => {
  if (!value) return "";
  // Already a "HH:MM" string
  if (typeof value === "string" && value.includes(":")) {
    return value.slice(0, 5);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AttendanceRequestModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
  initialData = null,
  currentUser = null,
  title = "New Attendance Request",
  subtitle = "Raise an attendance correction request",
}) {
  const [form, setForm] = useState(() => {
    // When editing, prefill from the existing request.
    if (initialData) {
      return {
        employeeId: initialData?.employeeId || "",
        employeeName: initialData?.employeeName || "",
        department: initialData?.department || "",
        designation: initialData?.designation || "",
        type: initialData?.type || "",
        date: initialData?.date || new Date().toISOString().split("T")[0],
        requestedCheckIn: toTimeInputValue(initialData?.requestedCheckIn),
        requestedCheckOut: toTimeInputValue(initialData?.requestedCheckOut),
        reason: initialData?.reason || "",
      };
    }

    // When creating, auto-fill the logged-in user's employee details.
    return getInitialRequestForm(currentUser);
  });

  const [errors, setErrors] = useState({});

  if (!open) return null;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    // Clear the field error as the user types
    if (errors[e.target.name]) {
      setErrors((prev) => ({
        ...prev,
        [e.target.name]: "",
      }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.employeeId.trim()) {
      nextErrors.employeeId = "Employee ID is required.";
    }
    if (!form.employeeName.trim()) {
      nextErrors.employeeName = "Employee name is required.";
    }
    if (!form.type) {
      nextErrors.type = "Please select a request type.";
    }
    if (!form.date) {
      nextErrors.date = "Please select a date.";
    }
    if (
      (form.type === "Late Check-in" || form.type === "Missed Check-out") &&
      !form.requestedCheckIn &&
      !form.requestedCheckOut
    ) {
      nextErrors.requestedCheckIn =
        form.type === "Late Check-in"
          ? "Requested check-in time is required."
          : "Provide a check-in or check-out time.";
    }
    if (!form.reason.trim()) {
      nextErrors.reason = "Please provide a reason for this request.";
    }

    return nextErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      employeeId: form.employeeId.trim().toUpperCase(),
      employeeName: form.employeeName.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      type: form.type,
      date: form.date,
      requestedCheckIn: form.requestedCheckIn
        ? new Date(`${form.date}T${form.requestedCheckIn}`).getTime()
        : null,
      requestedCheckOut: form.requestedCheckOut
        ? new Date(`${form.date}T${form.requestedCheckOut}`).getTime()
        : null,
      reason: form.reason.trim(),
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiFileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Employee ID */}
            <div>
              <label className={labelClass}>Employee ID</label>
              <input
                type="text"
                name="employeeId"
                placeholder="e.g. EMP001"
                value={form.employeeId}
                onChange={handleChange}
                className={fieldClass}
              />
              {errors.employeeId && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.employeeId}
                </p>
              )}
            </div>

            {/* Employee Name */}
            <div>
              <label className={labelClass}>Employee Name</label>
              <input
                type="text"
                name="employeeName"
                placeholder="e.g. Rahul Sharma"
                value={form.employeeName}
                onChange={handleChange}
                className={fieldClass}
              />
              {errors.employeeName && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.employeeName}
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className={labelClass}>Department</label>
              <input
                type="text"
                name="department"
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            {/* Designation */}
            <div>
              <label className={labelClass}>Designation</label>
              <input
                type="text"
                name="designation"
                placeholder="e.g. Senior Developer"
                value={form.designation}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            {/* Request Type */}
            <div>
              <label className={labelClass}>Request Type</label>
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
              {errors.type && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.type}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className={fieldClass}
              />
              {errors.date && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.date}
                </p>
              )}
            </div>

            {/* Requested Check-in */}
            <div>
              <label className={labelClass}>Requested Check-in</label>
              <input
                type="time"
                name="requestedCheckIn"
                value={form.requestedCheckIn || ""}
                onChange={handleChange}
                className={fieldClass}
              />
              {errors.requestedCheckIn && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.requestedCheckIn}
                </p>
              )}
            </div>

            {/* Requested Check-out */}
            <div>
              <label className={labelClass}>Requested Check-out</label>
              <input
                type="time"
                name="requestedCheckOut"
                value={form.requestedCheckOut || ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </div>

            {/* Reason */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Reason</label>
              <textarea
                name="reason"
                rows={3}
                placeholder="Explain why this correction is needed..."
                value={form.reason}
                onChange={handleChange}
                className={`${fieldClass} resize-none`}
              />
              {errors.reason && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.reason}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
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

export default AttendanceRequestModal;
