import { useEffect } from "react";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiLoader,
  FiUser,
  FiX,
} from "react-icons/fi";
import { formatDateTime } from "../../utils/attendance/attendanceDate";
import {
  formatLeaveDuration,
  formatLeaveRange,
  formatLeaveType,
  isPendingLeave,
} from "../../utils/leave/leaveUtils";
import LeaveStatusBadge from "./common/LeaveStatusBadge";

/*
|--------------------------------------------------------------------------
| Leave Request Detail
|--------------------------------------------------------------------------
| Everything stored on a request, plus the review actions.
|
| Approve and reject are only offered while the request is still pending and
| only to a reviewer, so a decided request can be read but not re-decided.
|--------------------------------------------------------------------------
*/

function DetailRow({ icon, label, value }) {

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || "--"}
        </p>

      </div>

    </div>
  );

}

function LeaveRequestDetailModal({
  open,
  request,
  canReview = false,
  onClose,
  onApprove,
  onReject,
  approving = false,
}) {

  useEffect(() => {

    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !approving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () =>
      window.removeEventListener("keydown", handleKeyDown);

  }, [open, approving, onClose]);

  if (!open || !request) return null;

  const showActions =
    canReview && isPendingLeave(request);

  return (

    /*
    | A sheet off the bottom edge on a phone and a centred dialog from `sm`,
    | which is the shape every other modal in the product takes. The header
    | and the review actions are pinned so a long reason scrolls between them
    | rather than pushing Approve out of reach.
    */
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">

        {/* Header */}

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11">
              <FiFileText size={20} />
            </div>

            <div className="min-w-0">

              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                Leave Request
              </h2>

              <p className="truncate text-xs text-slate-500 sm:text-sm">
                {/* {request.requestId} */}
              </p>

            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Moves into the body on a phone, where the header has no room
                for both the pill and the close button. */}
            <span className="hidden sm:inline-flex">
              <LeaveStatusBadge status={request.status} size="sm" />
            </span>

            <button
              type="button"
              onClick={onClose}
              disabled={approving}
              aria-label="Close"
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX size={20} />
            </button>

          </div>

        </div>

        {/* Body */}

        <div className="hide-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:space-y-4 sm:p-6">

          <div className="flex sm:hidden">
            <LeaveStatusBadge status={request.status} size="sm" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

            <DetailRow
              icon={<FiUser />}
              label="Employee"
              value={
                request.employeeName
                  ? `${request.employeeName} · ${request.employeeId}`
                  : request.employeeId
              }
            />

            <DetailRow
              icon={<FiCalendar />}
              label="Leave Dates"
              value={formatLeaveRange(request)}
            />

            <DetailRow
              icon={<FiClock />}
              label="Request Type"
              value={formatLeaveType(request)}
            />

            <DetailRow
              icon={<FiClock />}
              label="Duration"
              value={formatLeaveDuration(request.days)}
            />

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">

            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
              Reason
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {request.reason || "--"}
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

            <DetailRow
              icon={<FiClock />}
              label="Applied On"
              value={formatDateTime(request.requestedAt)}
            />

            <DetailRow
              icon={<FiCheck />}
              label="Reviewed"
              value={
                request.approvedAt
                  ? `${request.approvedBy || "--"} · ${formatDateTime(request.approvedAt)}`
                  : "Not reviewed yet"
              }
            />

          </div>

          {request.remarks && (

            <div className="rounded-xl border border-red-100 bg-red-50 p-3 sm:p-4">

              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500 sm:text-xs">
                Reviewer Remarks
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-red-700">
                {request.remarks}
              </p>

            </div>

          )}

        </div>

        {/* Footer */}

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={approving}
            className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>

          {showActions && (

            <>

              <button
                type="button"
                onClick={() => onReject(request)}
                disabled={approving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiX />
                Reject
              </button>

              <button
                type="button"
                onClick={() => onApprove(request)}
                disabled={approving}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {approving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                {approving ? "Approving..." : "Approve"}
              </button>

            </>

          )}

        </div>

      </div>

    </div>

  );

}

export default LeaveRequestDetailModal;
