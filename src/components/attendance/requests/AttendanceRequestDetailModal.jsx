import {
  FiAlertCircle,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLoader,
  FiUser,
  FiX,
} from "react-icons/fi";
import { REQUEST_STATUS } from "../../../utils/attendance/attendanceConstants";
import {
  formatDate,
  formatDateTime,
  formatTime,
} from "../../../utils/attendance/attendanceDate";
import {
  canReviewRequest,
  getRequestTypeLabel,
  hasRequestedTimes,
} from "../../../utils/attendance/attendanceRequestUtils";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import EmployeeCell from "../common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Attendance Request Details
|--------------------------------------------------------------------------
| The full request with the review actions. Approve is only offered when the
| request carries a punch time, because there would be nothing to apply to
| the attendance record otherwise.
|--------------------------------------------------------------------------
*/

function DetailItem({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-surface-muted p-4">

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {icon}
        {label}
      </div>

      <p className="mt-1.5 text-sm font-semibold text-ink-muted">
        {value || "--"}
      </p>

    </div>
  );
}

function AttendanceRequestDetailModal({
  open,
  request,
  currentUser,
  onClose,
  onApprove,
  onReject,
  approving = false,
  rejecting = false,
  /*
  | The department scope of the signed in user, or null for a role that is
  | never narrowed. Asked here as well as on the list rather than trusted from
  | it: the modal is reachable from a row somebody may only read, and the two
  | must not be able to disagree about whether it may also be decided.
  */
  reviewScope = null,
}) {

  if (!open || !request) return null;

  const canDecide = canReviewRequest(request, currentUser, reviewScope);

  const busy = approving || rejecting;

  return (
    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`.
    | The header and the review actions are pinned so a long request scrolls
    | between them rather than pushing Approve out of reach.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiFileText size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="ui-card-title">
                Request Details
              </h2>
              {/* <p className="truncate text-sm text-ink-subtle">
                {request.requestId}
              </p> */}
            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Moves down beside the employee on a phone, where the header
                has no room for both the pill and the close button. */}
            <span className="hidden sm:inline-flex">
              <AttendanceStatusBadge
                status={request.status}
                variant="request"
              />
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ui-icon-btn"
            >
              <FiX size={20} />
            </button>

          </div>

        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">

            <EmployeeCell
              name={request.employeeName}
              employeeId={request.employeeId}
              subtitle={[
                request.employeeId,
                request.department,
                request.designation,
              ]
                .filter(Boolean)
                .join(" · ")}
            />

            {/* The status the header gave up on a phone. */}
            <span className="sm:hidden">
              <AttendanceStatusBadge
                status={request.status}
                variant="request"
                size="sm"
              />
            </span>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <DetailItem
              icon={<FiClock className="text-ink-faint" />}
              label="Request Type"
              value={getRequestTypeLabel(request.type)}
            />

            <DetailItem
              icon={<FiCalendar className="text-ink-faint" />}
              label="Attendance Date"
              value={formatDate(request.date)}
            />

            <DetailItem
              icon={<FiUser className="text-ink-faint" />}
              label="Requested Punch In"
              value={formatTime(request.requestedPunchIn)}
            />

            <DetailItem
              icon={<FiBriefcase className="text-ink-faint" />}
              label="Requested Punch Out"
              value={formatTime(request.requestedPunchOut)}
            />

          </div>

          <div className="rounded-xl bg-surface-muted p-4">

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              <FiAlertCircle className="text-ink-faint" />
              Reason
            </div>

            <p className="mt-1.5 text-sm text-ink-muted">
              {request.reason || "--"}
            </p>

          </div>

          {request.status === REQUEST_STATUS.REJECTED && request.remarks && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">

              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                <FiAlertCircle />
                Rejection Remarks
              </div>

              <p className="mt-1.5 text-sm text-red-700">
                {request.remarks}
              </p>

            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <DetailItem
              icon={<FiClock className="text-ink-faint" />}
              label="Requested On"
              value={formatDateTime(request.requestedAt)}
            />

            <DetailItem
              icon={<FiCheckCircle className="text-ink-faint" />}
              label="Reviewed By"
              value={request.approvedBy || "--"}
            />

          </div>

          {request.approvedAt && (
            <DetailItem
              icon={<FiCalendar className="text-ink-faint" />}
              label="Decided On"
              value={formatDateTime(request.approvedAt)}
            />
          )}

        </div>

        {/* Footer */}
        {canDecide && (
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-line px-4 py-4 sm:flex-row sm:justify-end sm:px-6 sm:py-5">

            <button
              type="button"
              onClick={() => onReject(request)}
              disabled={busy}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rejecting ? <FiLoader className="animate-spin" /> : <FiX />}
              {rejecting ? "Rejecting..." : "Reject"}
            </button>

            <button
              type="button"
              onClick={() => onApprove(request)}
              disabled={busy || !hasRequestedTimes(request)}
              title={
                hasRequestedTimes(request)
                  ? undefined
                  : "This request has no punch time to apply."
              }
              className="ui-btn bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              {approving ? <FiLoader className="animate-spin" /> : <FiCheck />}
              {approving ? "Approving..." : "Approve"}
            </button>

          </div>
        )}

      </div>

    </div>
  );

}

export default AttendanceRequestDetailModal;
