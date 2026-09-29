import { useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiClipboard,
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
  ATTENDANCE_STATUS,
  STATUS_BADGES,
  STATUS_DOTS,
} from "../../../utils/attendance/attendanceConstants";
import {
  getApprovalLabel,
  getApprovalStatus,
  isTimeOptionalStatus,
} from "../../../utils/attendance/attendanceUtils";
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
| That includes what the day counts as. Present, Half Day and Absent sit on
| the day as one click each, in the colours they are read in everywhere else,
| so the day the punches describe correctly but which the reviewer judges
| differently - the fourth late arrival this week, marked Half Day for it - is
| settled here without a second modal on top of this one.
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
| Quick Status
|--------------------------------------------------------------------------
| What the day counts as, one click each.
|
| This is not a correction - the punch times are right and stay exactly as the
| employee recorded them. It is the reviewer deciding what the day is worth:
| somebody who arrives late every morning is marked Half Day for it, and the
| 10:40 punch in stays on the record as the reason.
|
| Each button always carries its own status colour, so the choice is made
| against the badge the day will be read in on every other screen. The one the
| day already is stays pressed and closed - pressing it would change nothing.
|
| Present and Half Day need a punch in. `validateAttendanceForm` refuses them
| without one, and there is nowhere here to type the missing time, so on a day
| with no punch in they are closed and say why rather than failing on save.
*/

const QUICK_STATUSES = [
  ATTENDANCE_STATUS.PRESENT,
  ATTENDANCE_STATUS.HALF_DAY,
  ATTENDANCE_STATUS.ABSENT,
];

function QuickStatusButtons({ record, saving, savingTo, locked, onSelect }) {

  const timed = Boolean(record.punchIn);

  return (
    <div
      role="group"
      aria-label="Mark attendance as"
      className="grid grid-cols-3 gap-2"
    >

      {QUICK_STATUSES.map((option) => {

        const current = record.status === option;

        const needsPunchIn = !timed && !isTimeOptionalStatus(option);

        const inFlight = saving && savingTo === option;

        const title = current
          ? `This day is already marked ${option}`
          : needsPunchIn
            ? `No punch in was recorded, so this day cannot be marked ${option}`
            : `Mark this day ${option} and approve it`;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            disabled={locked || current || needsPunchIn}
            aria-pressed={current}
            title={title}
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring disabled:cursor-not-allowed ${STATUS_BADGES[option]} ${
              current
                ? "shadow-sm ring-2"
                : "ring-1 hover:brightness-95 hover:shadow-sm disabled:opacity-40"
            }`}
          >

            {inFlight ? (
              <FiLoader className="shrink-0 animate-spin" size={14} />
            ) : current ? (
              <FiCheck className="shrink-0" size={14} />
            ) : (
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[option]}`}
              />
            )}

            <span className="truncate">{option}</span>

          </button>
        );

      })}

    </div>
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
  onClose,
}) {

  const status = getApprovalStatus(record);

  const label = getApprovalLabel(record);

  /*
  | Which of the three was pressed, so only that button spins while the page
  | writes it.
  */
  const [savingTo, setSavingTo] = useState("");

  const handleQuickStatus = (option) => {
    setSavingTo(option);
    onStatusChange(record, option);
  };

  /*
  | Every button on the modal is closed while the day is being written, not
  | only the one that was pressed - they all end up on the same record.
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
                | For a reviewer the pressed button below already says what
                | the day is, so the badge is only drawn when it would not be
                | said twice: for everyone else, and for a status the three
                | buttons do not cover - Late, Leave.
                */}
                {(!canReview || !QUICK_STATUSES.includes(record.status)) && (
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
          | Only for a reviewer who may decide this day - the same rule the
          | Approve and Reject buttons follow.
          */}
          {canReview && (
            <section>

              <p className="ui-eyebrow mb-2">
                Mark attendance as
              </p>

              <QuickStatusButtons
                record={record}
                saving={savingStatus}
                savingTo={savingTo}
                locked={locked}
                onSelect={handleQuickStatus}
              />

              <p className="mt-2 text-xs text-ink-subtle">
                Saves the status and approves the day under your name. Punch
                times stay as recorded.
              </p>

              {/*
              | Said before the click rather than after it: rewriting the day
              | drops the link to the leave request that booked it, so
              | deleting that leave later stops giving the day back.
              */}
              {record.leaveRequestId && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-800">

                  <FiAlertTriangle
                    className="mt-0.5 shrink-0 text-amber-600"
                    size={14}
                  />

                  This day was booked by an approved leave request. Changing
                  its status detaches the day from that request.

                </p>
              )}

            </section>
          )}

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
