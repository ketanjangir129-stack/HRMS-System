import { useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckSquare, FiLoader, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import SearchableSelect from "../common/SearchableSelect";
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_OPTIONS,
} from "../../utils/attendance/attendanceConstants";
import {
  getDateKey,
  toTimestamp,
} from "../../utils/attendance/attendanceDate";
import {
  isTimeOptionalStatus,
  validateAttendanceForm,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Mark Attendance (HR / Admin)
|--------------------------------------------------------------------------
| Records a day of attendance for an employee. The employee is picked from
| the directory, so the record can only ever reference an id that exists and
| no employee details are copied into it.
|--------------------------------------------------------------------------
*/

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const getEmptyForm = () => ({
  employeeId: "",
  date: getDateKey(),
  punchIn: "",
  punchOut: "",
  status: ATTENDANCE_STATUS.PRESENT,
  remarks: "",
});

function MarkAttendanceForm({
  onClose,
  onSave,
  employees = [],
  dayRecords = [],
  recordsDate = "",
}) {

  const [form, setForm] = useState(getEmptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  /*
  | Warn before replacing a day that is already recorded. Only the records of
  | `recordsDate` are loaded, so the check is skipped for any other date and
  | the service reports what actually happened instead.
  */
  const existingRecord =
    form.date === recordsDate && form.employeeId
      ? dayRecords.find(
        (record) => record.employeeId === form.employeeId
      )
      : null;

  const setField = (name, value) => {

    setForm((previous) => ({ ...previous, [name]: value }));

    setErrors((previous) =>
      previous[name] ? { ...previous, [name]: "" } : previous
    );

  };

  const handleChange = (event) =>
    setField(event.target.name, event.target.value);

  /*
  | The directory can be long, so the picker searches instead of scrolling.
  | Name and id stay in the label and the department becomes the hint, which
  | keeps both of them searchable.
  */
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.employeeId,
        label: `${employee.name} (${employee.employeeId})`,
        hint: employee.department ? `· ${employee.department}` : "",
      })),
    [employees]
  );

  const handleSubmit = async (event) => {

    event.preventDefault();

    const nextErrors = validateAttendanceForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);

    try {

      const result = await onSave({
        employeeId: form.employeeId,
        date: form.date,
        punchIn: toTimestamp(form.date, form.punchIn),
        punchOut: toTimestamp(form.date, form.punchOut),
        status: form.status,
        remarks: form.remarks.trim(),
      });

      if (!result?.success) {
        toast.error(result?.message || "Failed to save attendance.");
        return;
      }

      toast.success(
        result.updated
          ? "Attendance updated successfully."
          : "Attendance saved successfully."
      );

      onClose();

    } catch (error) {

      console.error(error);
      toast.error("Failed to save attendance.");

    } finally {

      setSaving(false);

    }

  };

  const timesOptional = isTimeOptionalStatus(form.status);

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`.
    | Full width and flush with the bottom is where a thumb can reach the
    | buttons; the header and footer are pinned and only the fields scroll,
    | so the keyboard never pushes Save off the screen.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiCheckSquare size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                Mark Attendance
              </h2>
              <p className="truncate text-sm text-slate-500">
                Record attendance for an employee
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

            {existingRecord && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" />

                <p className="text-sm text-amber-800">
                  This employee is already marked{" "}
                  <span className="font-semibold">
                    {existingRecord.status}
                  </span>{" "}
                  for this date
                  {existingRecord.punchInTime
                    ? ` (punch in ${existingRecord.punchInTime})`
                    : ""}
                  . Saving replaces that record.
                </p>

              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

              <div className="sm:col-span-2">

                <label className={labelClass}>
                  Employee <span className="text-red-500">*</span>
                </label>

                <SearchableSelect
                  options={employeeOptions}
                  value={form.employeeId}
                  onChange={(employeeId) => setField("employeeId", employeeId)}
                  placeholder="Select employee..."
                  searchPlaceholder="Search by name, ID or department..."
                  emptyMessage="No employees found"
                  ariaLabel="Select employee"
                  allowClear
                  className={`${fieldClass} cursor-pointer`}
                />

                {errors.employeeId && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.employeeId}
                  </p>
                )}

              </div>

              <div>

                <label className={labelClass}>
                  Date <span className="text-red-500">*</span>
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  max={getDateKey()}
                  onChange={handleChange}
                  className={fieldClass}
                />

                {errors.date && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.date}
                  </p>
                )}

              </div>

              <div>

                <label className={labelClass}>Status</label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={`${fieldClass} cursor-pointer`}
                >
                  {ATTENDANCE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

              </div>

              <div>

                <label className={labelClass}>
                  Punch In
                  {!timesOptional && <span className="ml-1 text-red-500">*</span>}
                </label>

                <input
                  type="time"
                  name="punchIn"
                  value={form.punchIn}
                  onChange={handleChange}
                  className={fieldClass}
                />

                {errors.punchIn && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.punchIn}
                  </p>
                )}

              </div>

              <div>

                <label className={labelClass}>Punch Out</label>

                <input
                  type="time"
                  name="punchOut"
                  value={form.punchOut}
                  onChange={handleChange}
                  className={fieldClass}
                />

                {errors.punchOut && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.punchOut}
                  </p>
                )}

              </div>

              <div className="sm:col-span-2">

                <label className={labelClass}>Remarks</label>

                <input
                  type="text"
                  name="remarks"
                  placeholder="Optional note"
                  value={form.remarks}
                  onChange={handleChange}
                  className={fieldClass}
                />

              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <FiLoader className="animate-spin" />}
              {saving
                ? "Saving..."
                : existingRecord
                  ? "Update Attendance"
                  : "Save Attendance"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );

}

/*
| The form only exists while the modal is open, so it always starts empty.
*/

function MarkAttendanceModal({ open, ...props }) {

  if (!open) return null;

  return <MarkAttendanceForm {...props} />;

}

export default MarkAttendanceModal;
