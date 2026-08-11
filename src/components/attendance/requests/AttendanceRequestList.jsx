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

/*
| Written out in full rather than built from a breakpoint variable: Tailwind
| generates its CSS by scanning the source for literal class names, so an
| interpolated `${bp}:table-cell` would never be emitted.
*/

const HIDDEN_UNTIL = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const hideBelow = (breakpoint) => ({
  headerClassName: HIDDEN_UNTIL[breakpoint],
  className: HIDDEN_UNTIL[breakpoint],
});

/*
| Two sizes. The table row keeps its 36px square; the phone card asks for the
| 44px one, which is the smallest square a thumb hits reliably and the size a
| hover title is no help at.
*/

function RowAction({ tone, title, onClick, icon, size = "sm" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all ${size === "lg" ? "h-11 w-11" : "h-9 w-9"} ${ACTION_STYLES[tone]}`}
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

  /*
  | The table row's actions. The phone card offers the same five, laid out for
  | a thumb rather than for a cell — see `mobileCard` below.
  */
  const renderActions = (request) => {

    const canModify = canModifyRequest(request, currentUser);

    const canDecide = canReviewRequest(request, currentUser);

    return (
      <>
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
      </>
    );

  };

  /*
  | Who raised it, when it is for, where it stands and what can be done about
  | it stay at every width; the type and the requested times drop out as the
  | viewport narrows and are folded back into the employee cell, so nothing is
  | actually lost.
  */
  const columns = useMemo(
    () => [
      {
        key: "employeeName",
        label: "Employee",
        sortable: true,
        render: (request) => (
          <div className="min-w-0">

            <EmployeeCell
              name={request.employeeName}
              employeeId={request.employeeId}
              subtitle={
                request.department
                  ? `${request.employeeId} · ${request.department}`
                  : request.employeeId
              }
            />

            {/*
            | The columns hidden at this width, folded in here. Each span is
            | hidden at exactly the breakpoint where its own column appears,
            | so a value is never shown twice and never missing in between.
            */}
            <p className="mt-1.5 truncate text-xs text-slate-500 xl:hidden">

              <span className="lg:hidden">
                {getRequestTypeLabel(request.type)}
                {" · "}
              </span>

              In {formatTime(request.requestedPunchIn)} · Out{" "}
              {formatTime(request.requestedPunchOut)}

            </p>

          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        ...hideBelow("lg"),
        render: (request) => (
          <span className="inline-flex whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
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
        ...hideBelow("xl"),
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
        render: (request) => (
          <div className="flex items-center justify-center gap-1.5">
            {renderActions(request)}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, onApprove, onDelete, onEdit, onReject, onView]
  );

  /*
  | Phones get a card per request: who raised it and where it stands on top,
  | the type, the date and the requested times below, and the actions last.
  |
  | The actions are not the table's row of five identical squares. A square
  | with an icon in it is a guess on a touch screen - there is no hover title
  | to explain it, and approving somebody's attendance by guess is the one
  | thing this screen must not invite. So the two decisions are spelled out as
  | labelled buttons on a line of their own, opening the request is spelled
  | out beside them, and only editing and deleting your own request - which
  | reach for the same two icons everywhere else in the product - stay square.
  */
  const mobileCard = (request) => {

    const canModify = canModifyRequest(request, currentUser);

    const canDecide = canReviewRequest(request, currentUser);

    return (
      <div className="space-y-3">

        <div className="flex items-start justify-between gap-3">

          <EmployeeCell
            name={request.employeeName}
            employeeId={request.employeeId}
            subtitle={
              request.department
                ? `${request.employeeId} · ${request.department}`
                : request.employeeId
            }
            size="sm"
          />

          <span className="shrink-0">
            <AttendanceStatusBadge
              status={request.status}
              variant="request"
              size="sm"
            />
          </span>

        </div>

        <div className="space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">

          <div className="flex flex-wrap items-center gap-2">

            <span className="inline-flex whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {getRequestTypeLabel(request.type)}
            </span>

            <span className="text-xs font-medium text-slate-600">
              {formatDate(request.date)}
            </span>

          </div>

          <p className="text-xs text-slate-500">
            In{" "}
            <span className="font-semibold text-slate-800">
              {formatTime(request.requestedPunchIn)}
            </span>
            {" · "}
            Out{" "}
            <span className="font-semibold text-slate-800">
              {formatTime(request.requestedPunchOut)}
            </span>
          </p>

        </div>

        <div className="space-y-2">

          {/*
          | The decision, when there is one to make. Approve keeps its filled
          | green and reject its outline, so the destructive half of the pair
          | never reads as the default.
          */}
          {canDecide && (
            <div className="grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={() => onApprove(request)}
                disabled={!hasRequestedTimes(request)}
                title={
                  hasRequestedTimes(request)
                    ? undefined
                    : "This request has no punch time to apply."
                }
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiCheck size={16} />
                Approve
              </button>

              <button
                type="button"
                onClick={() => onReject(request)}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                <FiX size={16} />
                Reject
              </button>

            </div>
          )}

          {/*
          | Opening the request is offered on every row: it is the only way to
          | read the reason a correction was asked for, and on a phone it is
          | also where a decided request explains why it was turned down.
          */}
          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => onView(request)}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
            >
              <FiEye size={16} />
              View Details
            </button>

            {canModify && (
              <>
                <RowAction
                  tone="edit"
                  title="Edit request"
                  icon={<FiEdit2 size={16} />}
                  onClick={() => onEdit(request)}
                  size="lg"
                />

                <RowAction
                  tone="delete"
                  title="Delete request"
                  icon={<FiTrash2 size={16} />}
                  onClick={() => onDelete(request)}
                  size="lg"
                />
              </>
            )}

          </div>

        </div>

      </div>
    );

  };

  const createButton = (
    <button
      type="button"
      onClick={onCreate}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
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
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">

            {canReview && onScopeChange && (
              /* Fills its line on a phone, so both halves are a comfortable
                 tap target rather than two small pills in a corner. */
              <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 sm:w-auto">

                {[
                  { value: "all", label: "All Requests" },
                  { value: "mine", label: "My Requests" },
                ].map((tab) => (

                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => onScopeChange(tab.value)}
                    className={`flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
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
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint, so a tablet
        | scrolls a compact four column table instead of a 1000px one.
        */
        minWidthClass="min-w-[660px] lg:min-w-[800px] xl:min-w-[1000px]"
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
