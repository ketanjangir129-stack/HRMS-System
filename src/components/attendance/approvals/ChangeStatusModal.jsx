import { useState } from "react";
import {
  FiAlertTriangle,
  FiEdit3,
  FiInfo,
  FiLoader,
  FiX,
} from "react-icons/fi";
import {
  ATTENDANCE_STATUS_OPTIONS,
  STATUS_BADGES,
} from "../../../utils/attendance/attendanceConstants";
import {
  formatDate,
  toTimeInputValue,
  toTimestamp,
} from "../../../utils/attendance/attendanceDate";
import {
  isTimeOptionalStatus,
  validateAttendanceForm,
} from "../../../utils/attendance/attendanceUtils";
import EmployeeCell from "../common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Change Status
|--------------------------------------------------------------------------
| Correcting the day, rather than only deciding it.
|
| Approve and reject answer one question: is the day as recorded true. They
| cannot answer the one that comes up just as often - the day happened, but
| not the way the punch says it did. Somebody who left at lunch is recorded
| Present for a full day; somebody who never came in has no record and was
| marked by hand as Present in error. Rejecting either is the wrong answer: it
| takes the whole day away and leaves the employee to raise a correction for
| something the reviewer already knows the truth about.
|
| So the status is editable here, with the punch times beside it, because
| changing what a day was without being able to fix when it started is half a
| correction.
|
| Saving is itself the approval. Only somebody entitled to decide the day can
| open this, and they have just said what the day was - asking them to approve
| their own correction afterwards would be asking the same question twice.
| That is the rule the manual attendance form already runs on, and this writes
| through the same service call, so a day corrected here and a day marked by
| hand end up identical on the record.
|--------------------------------------------------------------------------
*/

const fieldClass = "ui-field";

const labelClass = "ui-eyebrow mb-1.5 block";

function ChangeStatusForm({
  record,
  saving = false,
  onSave,
  onClose,
}) {

  const [form, setForm] = useState(() => ({
    employeeId: record.employeeId,
    date: record.date,
    status: record.status || ATTENDANCE_STATUS_OPTIONS[0],
    punchIn: toTimeInputValue(record.punchIn),
    punchOut: toTimeInputValue(record.punchOut),
    remarks: record.remarks || "",
  }));

  const [errors, setErrors] = useState({});

  const setField = (name, value) => {

    setForm((previous) => ({ ...previous, [name]: value }));

    setErrors((previous) =>
      previous[name] ? { ...previous, [name]: "" } : previous
    );

  };

  const handleChange = (event) =>
    setField(event.target.name, event.target.value);

  const timesOptional = isTimeOptionalStatus(form.status);

  const changed =
    form.status !== (record.status || "") ||
    form.punchIn !== toTimeInputValue(record.punchIn) ||
    form.punchOut !== toTimeInputValue(record.punchOut) ||
    form.remarks !== (record.remarks || "");

  const handleSubmit = async (event) => {

    event.preventDefault();

    /*
    | The same validation the manual attendance form runs, so a day corrected
    | here cannot be saved in a shape that form would have refused.
    */
    const nextErrors = validateAttendanceForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const result = await onSave({
      employeeId: form.employeeId,
      date: form.date,
      punchIn: toTimestamp(form.date, form.punchIn),
      punchOut: toTimestamp(form.date, form.punchOut),
      status: form.status,
      remarks: form.remarks.trim(),
    });

    if (result?.success) {
      onClose();
    }

  };

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`,
    | the same shape every other modal in the module uses.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiEdit3 size={18} />
            </div>

            <div className="min-w-0">

              <h2 className="ui-card-title">
                Change Status
              </h2>

              <p className="truncate text-sm text-ink-subtle">
                {formatDate(record.date)}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="ui-icon-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

            {/*
            | Whose day it is, stated once at the top. Neither the employee nor
            | the date is editable here: this form corrects a day that already
            | exists, and a picker for either would turn it into the manual
            | entry form under a different name.
            */}
            <div className="mb-5 rounded-xl border border-line bg-surface-muted px-4 py-3">
              <EmployeeCell
                name={record.employeeName}
                employeeId={record.employeeId}
                subtitle={
                  record.department
                    ? `${record.employeeId} · ${record.department}`
                    : record.employeeId
                }
                size="sm"
              />
            </div>

            {/* Status */}
            <div className="mb-5">

              <span className={labelClass}>
                Attendance Status
              </span>

              {/*
              | Buttons rather than a dropdown. Five options is a set small
              | enough to show, this is the one field the form exists for, and
              | each carries the colour it will be read in on the queue - so
              | the choice is made against the badge it becomes.
              */}
              <div className="flex flex-wrap gap-2">

                {ATTENDANCE_STATUS_OPTIONS.map((status) => {

                  const active = form.status === status;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setField("status", status)}
                      aria-pressed={active}
                      className={`cursor-pointer rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition-all ${
                        active
                          ? `${STATUS_BADGES[status]} shadow-sm`
                          : "bg-surface text-ink-subtle ring-line hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      {status}
                    </button>
                  );

                })}

              </div>

            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

              <div>

                <label htmlFor="change-punch-in" className={labelClass}>
                  Punch In
                  {!timesOptional && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                <input
                  id="change-punch-in"
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

                <label htmlFor="change-punch-out" className={labelClass}>
                  Punch Out
                </label>

                <input
                  id="change-punch-out"
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

                <label htmlFor="change-remarks" className={labelClass}>
                  Remarks
                </label>

                <input
                  id="change-remarks"
                  type="text"
                  name="remarks"
                  placeholder="Why the day was corrected"
                  value={form.remarks}
                  onChange={handleChange}
                  className={fieldClass}
                />

              </div>

            </div>

            {/*
            | Said before the button is pressed, not discovered afterwards. A
            | correction is a sign off, and the previous decision - including a
            | rejection somebody else made - is replaced by this one.
            */}
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">

              <FiInfo className="mt-0.5 shrink-0 text-blue-600" size={15} />

              <p className="text-xs font-medium text-blue-800">
                Saving records the corrected day and approves it under your
                name. Any earlier decision on this day is replaced.
              </p>

            </div>

            {/*
            | A day the leave module booked carries a link back to the request
            | that created it. Rewriting the day drops that link, which is how
            | a day HR has since corrected stops being given back when the
            | leave is deleted - long standing behaviour of the module, and
            | worth saying out loud on the one screen where it is easy to do
            | by accident.
            */}
            {record.leaveRequestId && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">

                <FiAlertTriangle
                  className="mt-0.5 shrink-0 text-amber-600"
                  size={15}
                />

                <p className="text-xs font-medium text-amber-800">
                  This day was booked by an approved leave request. Correcting
                  it detaches the day from that request, so deleting the leave
                  later will no longer change this day.
                </p>

              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="ui-btn ui-btn-secondary font-semibold"
            >
              Cancel
            </button>

            {/*
            | Closed until something actually changes. Saving an untouched day
            | would still rewrite the record and re-sign it, which is a
            | decision nobody meant to make.
            */}
            <button
              type="submit"
              disabled={saving || !changed}
              className="ui-btn ui-btn-primary font-semibold"
            >
              {saving && <FiLoader className="animate-spin" />}
              {saving ? "Saving..." : "Save & Approve"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );

}

/*
| The form only exists while the modal is open, so it is always seeded from
| the day being corrected rather than from the last one that was.
*/

function ChangeStatusModal({ open, record, ...props }) {

  if (!open || !record) return null;

  return <ChangeStatusForm record={record} {...props} />;

}

export default ChangeStatusModal;
