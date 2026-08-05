import {
  FiX,
  FiCheck,
  FiClock,
  FiUser,
  FiBriefcase,
  FiCalendar,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";
import {
  formatDate,
  formatTime,
  formatDateTime,
  STATUS_BADGES,
  STATUS_DOTS,
} from "../../../utils/attendance/attendanceRequestUtils";

function DetailItem({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-sm font-semibold text-slate-800">{value || "--"}</p>
    </div>
  );
}

function AttendanceRequestDetailModal({
  open,
  request,
  onClose,
  onApprove,
  onReject,
  approving = false,
  rejecting = false,
}) {
  if (!open || !request) return null;

  const isPending = request.status === "Pending";

  const canApprove =
    request.requestedCheckIn || request.requestedCheckOut;

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
              <h2 className="text-lg font-semibold text-slate-900">
                Request Details
              </h2>
              <p className="text-sm text-slate-500">
                {request.requestId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                STATUS_BADGES[request.status] ||
                "bg-slate-50 text-slate-700 ring-slate-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  STATUS_DOTS[request.status] || "bg-slate-500"
                }`}
              />
              {request.status}
            </span>

            <button
              onClick={onClose}
              className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] space-y-4 overflow-y-auto p-6">
          {/* Employee */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {request.employeeName
                ?.split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {request.employeeName}
              </p>
              <p className="text-sm text-slate-500">
                {request.employeeId}
                {request.department ? ` · ${request.department}` : ""}
                {request.designation ? ` · ${request.designation}` : ""}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem
              icon={<FiClock className="text-slate-400" />}
              label="Request Type"
              value={request.type}
            />
            <DetailItem
              icon={<FiCalendar className="text-slate-400" />}
              label="Attendance Date"
              value={formatDate(request.date)}
            />
            <DetailItem
              icon={<FiUser className="text-slate-400" />}
              label="Requested Check-in"
              value={formatTime(request.requestedCheckIn)}
            />
            <DetailItem
              icon={<FiBriefcase className="text-slate-400" />}
              label="Requested Check-out"
              value={formatTime(request.requestedCheckOut)}
            />
          </div>

          {/* Reason */}
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <FiAlertCircle className="text-slate-400" />
              Reason
            </div>
            <p className="mt-1.5 text-sm text-slate-700">
              {request.reason || "--"}
            </p>
          </div>

          {/* Remarks (when rejected) */}
          {request.status === "Rejected" && request.remarks && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-500">
                <FiAlertCircle />
                Rejection Remarks
              </div>
              <p className="mt-1.5 text-sm text-red-700">{request.remarks}</p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem
              icon={<FiClock className="text-slate-400" />}
              label="Requested On"
              value={formatDateTime(request.requestedAt)}
            />
            <DetailItem
              icon={<FiCheckCircle className="text-slate-400" />}
              label="Approved / Rejected By"
              value={request.approvedBy || "--"}
            />
          </div>

          {request.approvedAt && (
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FiCalendar className="text-slate-400" />
                Decided On
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-800">
                {formatDateTime(request.approvedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isPending && (
          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
            <button
              onClick={() => onReject(request)}
              disabled={rejecting || approving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rejecting ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiX />
              )}
              {rejecting ? "Rejecting..." : "Reject"}
            </button>
            <button
              onClick={() => onApprove(request)}
              disabled={approving || rejecting || !canApprove}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approving ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiCheck />
              )}
              {approving ? "Approving..." : "Approve"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceRequestDetailModal;
