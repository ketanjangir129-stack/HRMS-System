import { useMemo, useState } from "react";
import {
  FiCheck,
  FiEdit2,
  FiEye,
  FiFileText,
  FiFilter,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  REQUEST_STATUS,
  REQUEST_TYPES,
} from "../../../utils/attendance/attendanceConstants";
import { formatDate, formatTime } from "../../../utils/attendance/attendanceDate";
import {
  canModifyRequest,
  canReviewRequest,
  filterRequests,
  getRequestTypeLabel,
  hasRequestedTimes,
} from "../../../utils/attendance/attendanceRequestUtils";
import { AttendancePanel } from "../common/AttendancePanel";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import DataTable from "../common/DataTable";
import EmployeeCell from "../common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Attendance Request List
|--------------------------------------------------------------------------
| Search comes from the header search bar. Status and type filters, sorting
| and pagination are handled here; what each row may do is decided by the
| request permission helpers, so an employee never sees review actions and a
| decided request can no longer be edited.
|--------------------------------------------------------------------------
*/

const ACTION_STYLES = {
  view: "hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600",
  edit: "hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600",
  approve: "hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600",
  reject: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
  delete: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
};

function RowAction({ tone, title, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all ${ACTION_STYLES[tone]}`}
    >
      {icon}
    </button>
  );
}

function AttendanceRequestList({
  requests = [],
  loading,
  error,
  onRetry,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onCreate,
  currentUser,
  headerSearch = "",
  scope = "all",
  onScopeChange,
  canReview = false,
}) {

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(
    () =>
      filterRequests(requests, {
        search: headerSearch,
        status: statusFilter,
        type: typeFilter,
      }),
    [requests, headerSearch, statusFilter, typeFilter]
  );

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (request) => request.status === REQUEST_STATUS.PENDING
      ).length,
    [requests]
  );

  const resetFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
  };

  const hasFilters = Boolean(statusFilter || typeFilter);

  const columns = useMemo(
    () => [
      {
        key: "employeeName",
        label: "Employee",
        sortable: true,
        render: (request) => (
          <EmployeeCell
            name={request.employeeName}
            employeeId={request.employeeId}
            subtitle={
              request.department
                ? `${request.employeeId} · ${request.department}`
                : request.employeeId
            }
          />
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (request) => (
          <span className="whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {getRequestTypeLabel(request.type)}
          </span>
        ),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        className: "font-medium whitespace-nowrap",
        render: (request) => formatDate(request.date),
      },
      {
        key: "requestedPunchIn",
        label: "Requested Times",
        render: (request) => (
          <div className="flex flex-col gap-0.5 whitespace-nowrap text-slate-600">
            <span>
              In:{" "}
              <span className="font-semibold text-slate-800">
                {formatTime(request.requestedPunchIn)}
              </span>
            </span>
            <span>
              Out:{" "}
              <span className="font-semibold text-slate-800">
                {formatTime(request.requestedPunchOut)}
              </span>
            </span>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (request) => (
          <AttendanceStatusBadge
            status={request.status}
            variant="request"
          />
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "center",
        render: (request) => {

          const canModify = canModifyRequest(request, currentUser);

          const canDecide = canReviewRequest(request, currentUser);

          return (
            <div className="flex items-center justify-center gap-1.5">

              <RowAction
                tone="view"
                title="View details"
                icon={<FiEye size={16} />}
                onClick={() => onView(request)}
              />

              {canModify && (
                <RowAction
                  tone="edit"
                  title="Edit request"
                  icon={<FiEdit2 size={16} />}
                  onClick={() => onEdit(request)}
                />
              )}

              {canDecide && hasRequestedTimes(request) && (
                <RowAction
                  tone="approve"
                  title="Approve request"
                  icon={<FiCheck size={16} />}
                  onClick={() => onApprove(request)}
                />
              )}

              {canDecide && (
                <RowAction
                  tone="reject"
                  title="Reject request"
                  icon={<FiX size={16} />}
                  onClick={() => onReject(request)}
                />
              )}

              {canModify && (
                <RowAction
                  tone="delete"
                  title="Delete request"
                  icon={<FiTrash2 size={16} />}
                  onClick={() => onDelete(request)}
                />
              )}

            </div>
          );

        },
      },
    ],
    [currentUser, onApprove, onDelete, onEdit, onReject, onView]
  );

  const createButton = (
    <button
      type="button"
      onClick={onCreate}
      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
    >
      <FiPlus size={18} />
      New Request
    </button>
  );

  return (
    <AttendancePanel
      title="Attendance Requests"
      subtitle={
        pendingCount > 0 ? (
          <>
            <span className="font-semibold text-amber-600">
              {pendingCount}
            </span>{" "}
            pending request{pendingCount !== 1 && "s"} awaiting review
          </>
        ) : (
          "Review and manage attendance correction requests"
        )
      }
      action={createButton}
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-3">

            {canReview && onScopeChange && (
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">

                {[
                  { value: "all", label: "All Requests" },
                  { value: "mine", label: "My Requests" },
                ].map((tab) => (

                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onScopeChange(tab.value)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      scope === tab.value
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>

                ))}

              </div>
            )}

            <button
              type="button"
              onClick={() => setShowFilters((previous) => !previous)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                showFilters
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FiFilter />
              Filters
              {hasFilters && (
                <span className="h-2 w-2 rounded-full bg-blue-600" />
              )}
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <FiX />
                Clear
              </button>
            )}

          </div>

          {showFilters && (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-2">

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Statuses</option>
                {Object.values(REQUEST_STATUS).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                aria-label="Filter by type"
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Types</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

            </div>
          )}
        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(request) => request.requestId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton
        defaultSortBy="requestedAt"
        defaultSortOrder="desc"
        resetKey={`${headerSearch}|${statusFilter}|${typeFilter}|${scope}`}
        paginationLabel="requests"
        minWidthClass="min-w-[1000px]"
        empty={{
          icon: <FiFileText size={28} />,
          title:
            requests.length === 0
              ? "No Attendance Requests"
              : "No Matching Requests",
          message:
            requests.length === 0
              ? "Raise a request to correct a punch in, a punch out or a full day of attendance."
              : "Try adjusting your search or filter criteria.",
          action:
            requests.length === 0 ? (
              createButton
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Clear Filters
              </button>
            ),
        }}
      />

    </AttendancePanel>
  );

}

export default AttendanceRequestList;
