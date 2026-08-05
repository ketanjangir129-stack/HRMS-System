import { FiArrowRight, FiClock } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { REQUEST_STATUS } from "../../utils/attendance/attendanceConstants";
import { formatDate } from "../../utils/attendance/attendanceDate";
import {
  canReviewRequest,
  getRequestTypeLabel,
  hasRequestedTimes,
} from "../../utils/attendance/attendanceRequestUtils";
import { AttendancePanel } from "./common/AttendancePanel";
import AttendanceStatusBadge from "./common/AttendanceStatusBadge";
import { EmptyState, TableSkeleton } from "./common/AttendanceState";
import EmployeeCell from "./common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Attendance Requests (Dashboard)
|--------------------------------------------------------------------------
| The latest requests with inline review actions. The full list, with search,
| filters and pagination, lives on the requests page.
|--------------------------------------------------------------------------
*/

const VISIBLE_REQUESTS = 5;

function AttendanceRequests({
  requests = [],
  loading,
  currentUser,
  onApprove,
  onReject,
}) {

  const navigate = useNavigate();

  const pendingCount = requests.filter(
    (request) => request.status === REQUEST_STATUS.PENDING
  ).length;

  const visible = requests.slice(0, VISIBLE_REQUESTS);

  return (
    <AttendancePanel
      title="Attendance Requests"
      subtitle={
        pendingCount > 0
          ? `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""}`
          : "No requests awaiting review"
      }
      action={
        <button
          type="button"
          onClick={() => navigate("/attendance/requests")}
          className="group inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
        >
          View All
          <FiArrowRight className="text-xs transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      }
      className="h-full"
    >

      {loading && <TableSkeleton rows={3} />}

      {!loading && visible.length === 0 && (
        <EmptyState
          icon={<FiClock size={28} />}
          title="No Requests"
          message="Attendance correction requests will appear here."
        />
      )}

      {!loading && visible.length > 0 && (

        <div className="divide-y divide-slate-100">

          {visible.map((request) => (

            <div
              key={request.requestId}
              className="flex flex-col gap-3 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >

              <EmployeeCell
                name={request.employeeName}
                employeeId={request.employeeId}
                subtitle={`${getRequestTypeLabel(request.type)} · ${formatDate(request.date)}`}
              />

              {canReviewRequest(request, currentUser) ? (

                <div className="flex shrink-0 gap-2">

                  <button
                    type="button"
                    onClick={() => onReject(request)}
                    className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => onApprove(request)}
                    disabled={!hasRequestedTimes(request)}
                    title={
                      hasRequestedTimes(request)
                        ? undefined
                        : "This request has no punch time to apply."
                    }
                    className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve
                  </button>

                </div>

              ) : (

                <AttendanceStatusBadge
                  status={request.status}
                  variant="request"
                  size="sm"
                />

              )}

            </div>

          ))}

        </div>

      )}

    </AttendancePanel>
  );

}

export default AttendanceRequests;
