import { useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiClipboard,
  FiEdit3,
  FiExternalLink,
  FiLoader,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import {
  formatDate,
  formatTime,
} from "../../../utils/attendance/attendanceDate";
import {
  APPROVAL_STATUS,
  ATTENDANCE_STATUS_OPTIONS,
  STATUS_DOTS,
} from "../../../utils/attendance/attendanceConstants";
import {
  getApprovalLabel,
  getApprovalStatus,
  isTimeOptionalStatus,
} from "../../../utils/attendance/attendanceUtils";
import TaskSelect from "../../tasks/TaskSelect";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import EmployeeCell from "../common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Approval Detail
|--------------------------------------------------------------------------
| The whole day, before a decision is made about it.
|
| The queue behind this is a list of rows, and a row is the right shape for
| working through a morning of routine sign offs. It is the wrong shape for
| the one day that looks odd - the punch out that never happened, the arrival
| two hours late, the day that was already turned down once and is back. This
| is where that day is read in full: both punches with where they were made,
| the hours they add up to, whatever the employee wrote on it, and the whole
| decision trail underneath.
|
| The decision is offered from here as well as from the row, so a reviewer who
| opened a day to understand it does not have to close it again to act.
|
| The status pill is part of that: it is a dropdown, so the day the punches
| describe correctly but which the reviewer judges differently - the fourth
| late arrival this week, marked Half Day for it - is settled on the screen
| where that was worked out, without a second modal on top of this one.
|--------------------------------------------------------------------------
*/

const isPlottable = (location) =>
  Number.isFinite(location?.latitude) &&
  Number.isFinite(location?.longitude);

const mapsUrl = ({ latitude, longitude }) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

function PunchTile({ icon, label, time, location }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">

      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
        {icon}
        {label}
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-ink-muted">
        {formatTime(time)}
      </p>

      {/*
      | The coordinate itself belongs on the location modal the table already
      | opens. What matters here is only whether the punch carried one, and a
      | way through to it for the day that needs checking.
      */}
      {isPlottable(location) && (
        <a
          href={mapsUrl(location)}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          <FiMapPin size={12} />
          Location
          <FiExternalLink size={11} />
        </a>
      )}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Status Picker
|--------------------------------------------------------------------------
| The status pill, opened.
|
| This is not a correction - the punch times are right and stay exactly as the
| employee recorded them. It is the reviewer overriding what the day is worth:
| somebody who arrives late every morning is marked Half Day for it, and the
| 10:40 punch in stays on the record as the reason.
|
| The pill itself is the trigger, so the choice is made against the colour it
| becomes, and `TaskSelect` portals the open list out of the modal's scrolling
| body - kept inside, it would be clipped by the overflow.
|
| A day with no punch in is only offered the statuses that do not need one.
| `validateAttendanceForm` refuses the others, and there is nowhere here to
| type the missing time - that is what the Change Status form is for, so a day
| that needs one is sent there rather than failing on save.
*/
function StatusPicker({ record, value, disabled, onChange }) {

  const timed = Boolean(record.punchIn);

  const options = ATTENDANCE_STATUS_OPTIONS.filter(
    (status) =>
      timed ||
      isTimeOptionalStatus(status) ||
      status === record.status
  ).map((status) => ({
    value: status,
    label: status,
    dot: STATUS_DOTS[status],
  }));

  return (
    <TaskSelect
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      ariaLabel="Attendance status"
      className="cursor-pointer rounded-full"
      trigger={
        <span className="inline-flex items-center gap-1">

          <AttendanceStatusBadge status={value} size="sm" />

          <FiChevronDown size={14} className="text-ink-faint" />

        </span>
      }
    />
  );

}

function ApprovalDetail({
  record,
  canReview = false,
  busy = false,
  savingStatus = false,
  onApprove,
  onReject,
  onStatusChange,
  onChangeStatus,
  onClose,
}) {

  const status = getApprovalStatus(record);

  const label = getApprovalLabel(record);

  /*
  | The status picked from the pill, before it is written.
  |
  | It is held rather than saved on selection: this write rewrites the day and
  | signs it off under the reviewer's name, which is far too much to happen
  | because a list was opened by accident and closed on the wrong row. So the
  | pill shows what the day would become and asks once.
  */
  const [draftStatus, setDraftStatus] = useState("");

  const pendingStatus =
    Boolean(draftStatus) && draftStatus !== record.status;

  /*
  | Every button on the modal is closed while the day is being written, not
  | only the one that was pressed - all three end up on the same record.
  */
  const locked = busy || savingStatus;

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred review dialog on
    | larger screens, so the approval table remains full width behind it.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5">

          <div className="min-w-0">

            <EmployeeCell
              name={record.employeeName}
              employeeId={record.employeeId}
              subtitle={
                record.department
                  ? `${record.employeeId} · ${record.department}`
                  : record.employeeId
              }
            />

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className="ui-icon-btn shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={20} />
          </button>

        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6 hide-scrollbar"> 

          {/* The day */}
          <section>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

              <h3 className="text-sm font-semibold text-ink">
                {formatDate(record.date)}
              </h3>

              <div className="flex items-center gap-2">

                {/*
                | The pill is the control for a reviewer who may decide this
                | day, and stays a plain badge for everyone else - the same
                | rule the two decision buttons already follow.
                */}
                {canReview ? (
                  <StatusPicker
                    record={record}
                    value={draftStatus || record.status}
                    disabled={locked}
                    onChange={setDraftStatus}
                  />
                ) : (
                  <AttendanceStatusBadge
                    status={record.status}
                    size="sm"
                  />
                )}

                <AttendanceStatusBadge
                  status={label}
                  variant="approval"
                  size="sm"
                />

              </div>

            </div>

            {/*
            | The ask. It only exists once a different status is picked, so
            | the day reads exactly as it did before until the reviewer has
            | actually chosen to change something.
            */}
            {pendingStatus && (
              <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">

                <p className="text-xs font-medium text-blue-800">
                  Mark this day as{" "}
                  <span className="font-semibold">{draftStatus}</span> instead
                  of {record.status}. The punch times stay as recorded, and
                  the day is approved under your name - any earlier decision
                  on it is replaced.
                </p>

                {/*
                | Said here for the same reason the correction form says it:
                | rewriting the day drops the link to the leave request that
                | booked it, so deleting that leave later stops giving the day
                | back.
                */}
                {record.leaveRequestId && (
                  <p className="mt-2 flex items-start gap-2 text-xs font-medium text-amber-800">

                    <FiAlertTriangle
                      className="mt-0.5 shrink-0 text-amber-600"
                      size={14}
                    />

                    This day was booked by an approved leave request. Changing
                    it detaches the day from that request.

                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={() => onStatusChange(record, draftStatus)}
                    disabled={locked}
                    className="ui-btn ui-btn-primary px-3 py-1.5 text-xs font-semibold"
                  >
                    {savingStatus && <FiLoader className="animate-spin" />}
                    {savingStatus ? "Saving..." : "Save & Approve"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftStatus("")}
                    disabled={locked}
                    className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">

              <PunchTile
                icon={<FiLogIn />}
                label="Punch In"
                time={record.punchIn}
                location={record.location?.punchIn}
              />

              <PunchTile
                icon={<FiLogOut />}
                label="Punch Out"
                time={record.punchOut}
                location={record.location?.punchOut}
              />

              <div className="rounded-xl bg-surface-muted p-3">

                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
                  <FiClipboard />
                  Hours
                </div>

                <p className="mt-1 truncate text-sm font-semibold text-ink-muted">
                  {record.workingHours || "--"}
                </p>

              </div>

            </div>

          </section>

          {/*
          | Said plainly rather than left to be worked out from two missing
          | buttons. A manager reading their own day, or a day from a
          | department they do not run, is not looking at a broken screen.
          */}
          {!canReview && (
            <p className="rounded-xl border border-line bg-surface-muted px-4 py-3 text-xs font-medium text-ink-subtle">
              This day is not yours to decide. Your own attendance, and
              anyone outside the departments you manage, is reviewed by HR.
            </p>
          )}

        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="ui-btn ui-btn-secondary font-semibold"
          >
            Close
          </button>

          {/*
          | Beside the two decisions rather than behind them, because reading
          | the day in full is exactly when it turns out the day was not what
          | the punch said - and having to close this and find the row again
          | to fix it is how a correction becomes a rejection instead.
          |
          | It stays even though the pill now changes the status on its own:
          | the pill overrides a day whose punches are right, and this is the
          | form for the day whose punches are not.
          */}
          {canReview && (
            <button
              type="button"
              onClick={() => onChangeStatus(record)}
              disabled={locked}
              className="ui-btn ui-btn-secondary font-semibold"
            >
              <FiEdit3 />
              Change Status
            </button>
          )}

          {/*
          | Both offered, each closed on the state the day is already in. A
          | decision can be revisited, so neither button disappears the moment
          | one is used - only the one that would change nothing is disabled.
          */}
          {canReview && (
            <>

              <button
                type="button"
                onClick={() => onReject(record)}
                disabled={locked || status === APPROVAL_STATUS.REJECTED}
                className="ui-btn border border-red-200 bg-red-50 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiX />
                Reject
              </button>

              <button
                type="button"
                onClick={() => onApprove(record)}
                disabled={locked || status === APPROVAL_STATUS.APPROVED}
                className="ui-btn bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {busy ? "Saving..." : "Approve"}
              </button>

            </>
          )}

        </div>

      </div>

    </div>
  );

}

/*
| The body only exists while the modal is open, so a day is always read fresh
| rather than showing the last one behind a fade.
*/

function ApprovalDetailModal({ open, record, ...props }) {

  if (!open || !record) return null;

  return <ApprovalDetail record={record} {...props} />;

}

export default ApprovalDetailModal;
