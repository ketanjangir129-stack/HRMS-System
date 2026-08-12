import {
  FiCalendar,
  FiClock,
  FiEye,
  FiInbox,
  FiTrash2,
} from "react-icons/fi";
import { AttendancePanel } from "../attendance/common/AttendancePanel";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../attendance/common/AttendanceState";
import { formatDateTime } from "../../utils/attendance/attendanceDate";
import { RECENT_LEAVE_REQUESTS } from "../../utils/leave/leaveConstants";
import {
  canDeleteLeaveRequest,
  formatLeaveDuration,
  formatLeaveRange,
  formatLeaveType,
  isPendingLeave,
} from "../../utils/leave/leaveUtils";
import LeaveStatusBadge from "./common/LeaveStatusBadge";

/*
|--------------------------------------------------------------------------
| Recent Leave Requests
|--------------------------------------------------------------------------
| The five newest requests of the signed in employee, so the outcome of an
| application is visible without opening the full history below.
|
| A pending request can still be withdrawn from here. Once it has been
| reviewed it is a record and only the history keeps it.
|--------------------------------------------------------------------------
*/

function RecentLeaveRequests({
  requests = [],
  loading = false,
  error = "",
  onRetry,
  employeeId,
  onView,
  onDelete,
}) {

  const pendingCount =
    requests.filter(isPendingLeave).length;

  const visible = requests.slice(0, RECENT_LEAVE_REQUESTS);

  return (

    <AttendancePanel
      title="Recent Leave Requests"
      subtitle={
        pendingCount > 0
          ? `${pendingCount} request${pendingCount !== 1 ? "s" : ""} awaiting approval`
          : "Your latest leave applications"
      }
      action={
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
          {requests.length} Total
        </span>
      }
      className="h-full"
    >

      {loading && <TableSkeleton rows={3} />}

      {!loading && error && (
        <ErrorState message={error} onRetry={onRetry} />
      )}

      {!loading && !error && visible.length === 0 && (

        <EmptyState
          icon={<FiInbox size={28} />}
          title="No Leave Requests"
          message="Applications you submit will appear here."
        />

      )}

      {!loading && !error && visible.length > 0 && (

        <div className="divide-y divide-slate-100">

          {visible.map((request) => (

            <div
              key={request.requestId}
              className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >

              <div className="flex min-w-0 items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FiCalendar />
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-semibold text-slate-800">
                    {formatLeaveRange(request)}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {formatLeaveType(request)} ·{" "}
                    {formatLeaveDuration(request.days)}
                  </p>

                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <FiClock size={11} />
                    Applied {formatDateTime(request.requestedAt)}
                  </p>

                </div>

              </div>

              {/* Indented to clear the icon when the row stacks on mobile. */}
              <div className="flex shrink-0 flex-wrap items-center gap-2 pl-13 sm:pl-0">

                <LeaveStatusBadge status={request.status} size="sm" />

                {onView && (
                  <button
                    type="button"
                    onClick={() => onView(request)}
                    aria-label="View request"
                    title="View request"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 sm:h-8 sm:w-8"
                  >
                    <FiEye size={14} />
                  </button>
                )}

                {onDelete && canDeleteLeaveRequest(request, employeeId) && (
                  <button
                    type="button"
                    onClick={() => onDelete(request)}
                    aria-label="Withdraw request"
                    title="Withdraw request"
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}

              </div>

            </div>

          ))}

        </div>

      )}

    </AttendancePanel>

  );

}

export default RecentLeaveRequests;
