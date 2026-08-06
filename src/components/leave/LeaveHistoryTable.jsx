import { useMemo, useState } from "react";
import { FiCalendar, FiSearch } from "react-icons/fi";
import {
  AttendancePanel,
  ExportButton,
  FilterSelect,
} from "../attendance/common/AttendancePanel";
import DataTable from "../attendance/common/DataTable";
import EmployeeCell from "../attendance/common/EmployeeCell";
import { formatDateTime } from "../../utils/attendance/attendanceDate";
import { downloadCsv } from "../../utils/attendance/attendanceTable";
import {
  LEAVE_PAGE_SIZE,
  LEAVE_REQUEST_TYPES,
  LEAVE_STATUS_OPTIONS,
} from "../../utils/leave/leaveConstants";
import {
  filterLeaveRequests,
  formatLeaveDuration,
  formatLeaveRange,
  formatLeaveType,
} from "../../utils/leave/leaveUtils";
import LeaveStatusBadge from "./common/LeaveStatusBadge";

/*
|--------------------------------------------------------------------------
| Leave History
|--------------------------------------------------------------------------
| The full list of leave requests with search, filters, sorting, pagination
| and a CSV export.
|
| It is the same table on the employee dashboard and on the HR approval page:
| `showEmployee` adds the employee column that only a reviewer needs, and
| `renderActions` supplies the buttons that belong to each screen. Keeping one
| table means the two lists cannot drift apart.
|
| Filtering stays here while sorting and pagination live in `DataTable`, which
| is the split the attendance tables already use.
|--------------------------------------------------------------------------
*/

const HIDDEN_UNTIL = {
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

const EXPORT_HEADER = [
  "Request ID",
  "Employee ID",
  "Employee",
  "Type",
  "From",
  "To",
  "Days",
  "Status",
  "Applied On",
  "Reviewed By",
  "Reason",
  "Remarks",
];

function LeaveHistoryTable({
  requests = [],
  loading = false,
  error = "",
  onRetry,
  title = "Leave History",
  subtitle = "Every leave request you have submitted",
  showEmployee = false,
  headerSearch = "",
  visibleColumns = null,
  renderActions,
  emptyTitle = "No Leave Requests",
  emptyMessage = "Leave requests will appear here once they are submitted.",
}) {

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");

  /*
  | The navbar search and the table's own box filter the same list, so a
  | keyword typed in either place narrows it.
  */
  const keyword = search || headerSearch;

  const filtered = useMemo(
    () =>
      filterLeaveRequests(requests, {
        search: keyword,
        status,
        requestType,
      }),
    [requests, keyword, status, requestType]
  );

  const handleExport = () => {

    downloadCsv(
      "leave-requests.csv",
      EXPORT_HEADER,
      filtered.map((request) => [
        request.requestId,
        request.employeeId,
        request.employeeName || "",
        formatLeaveType(request),
        request.fromDate,
        request.toDate,
        request.days,
        request.status,
        formatDateTime(request.requestedAt),
        request.approvedBy || "",
        request.reason || "",
        request.remarks || "",
      ])
    );

  };

  /*
  | Columns are prioritised rather than all forced onto a phone. The identity
  | of a request (who, which days, what happened to it) and its actions stay
  | on every screen; type, duration, reason and the applied timestamp drop out
  | as the viewport narrows and are repeated inside the leave dates cell, so
  | nothing is actually lost on a small screen.
  |
  | `visibleColumns` trims the set further per screen. The approval queue asks
  | for a shorter list than the employee's own history, and the folded lines
  | above follow it so a column that was dropped on purpose is not quietly
  | reintroduced on a phone.
  */

  const hasColumn = (key) =>
    !visibleColumns || visibleColumns.includes(key);

  /*
  | Written out in full rather than built from a breakpoint variable: Tailwind
  | generates its CSS by scanning the source for literal class names, so an
  | interpolated `${bp}:table-cell` would never be emitted.
  */

  const hideBelow = (breakpoint) => ({
    headerClassName: HIDDEN_UNTIL[breakpoint],
    className: HIDDEN_UNTIL[breakpoint],
  });

  const columns = [

    ...(showEmployee
      ? [
          {
            key: "employeeName",
            label: "Employee",
            sortable: true,
            render: (row) => (
              <EmployeeCell
                name={row.employeeName}
                employeeId={row.employeeId}
                subtitle={row.department}
                size="sm"
              />
            ),
          },
        ]
      : []),

    {
      key: "fromDate",
      label: "Leave Dates",
      sortable: true,
      render: (row) => (
        <div className="min-w-0">

          <p className="font-semibold text-slate-800">
            {formatLeaveRange(row)}
          </p>

          {/* <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.requestId}
          </p> */}

          {/*
          | The columns hidden at this width, folded in here. Each span is
          | hidden at exactly the breakpoint where its own column appears, so
          | a value is never shown twice and never missing in between.
          */}
          <p className="mt-1 text-xs text-slate-500 xl:hidden">

            {formatLeaveType(row)}

            {hasColumn("days") && (
              <span className="lg:hidden">
                {" · "}
                {formatLeaveDuration(row.days)}
              </span>
            )}

          </p>

          <p className="mt-0.5 text-xs text-slate-400 xl:hidden">
            Applied {formatDateTime(row.requestedAt)}
          </p>

        </div>
      ),
    },

    {
      key: "requestType",
      label: "Type",
      sortable: true,
      ...hideBelow("xl"),
      render: (row) => (
        <span className="text-sm text-slate-700">
          {formatLeaveType(row)}
        </span>
      ),
    },

    {
      key: "days",
      label: "Duration",
      sortable: true,
      align: "center",
      ...hideBelow("lg"),
      render: (row) => (
        <span className="inline-flex whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {formatLeaveDuration(row.days)}
        </span>
      ),
    },

    {
      key: "reason",
      label: "Reason",
      ...hideBelow("2xl"),
      render: (row) => (
        <p
          title={row.reason}
          className="line-clamp-2 max-w-[240px] text-sm text-slate-600"
        >
          {row.reason || "--"}
        </p>
      ),
    },

    {
      key: "requestedAt",
      label: "Applied On",
      sortable: true,
      ...hideBelow("xl"),
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-slate-600">
          {formatDateTime(row.requestedAt)}
        </span>
      ),
    },

    {
      key: "status",
      label: "Status",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex flex-col items-center gap-1">

          <LeaveStatusBadge status={row.status} size="sm" />

          {row.approvedBy && (
            <span className="max-w-[120px] truncate text-[11px] text-slate-400">
              by {row.approvedBy}
            </span>
          )}

        </div>
      ),
    },

    ...(renderActions
      ? [
          {
            key: "actions",
            label: "Actions",
            align: "right",
            className: "whitespace-nowrap",
            render: (row) => renderActions(row),
          },
        ]
      : []),

  ].filter((column) => hasColumn(column.key));

  return (

    <AttendancePanel
      title={title}
      subtitle={subtitle}
      action={
        <ExportButton
          onClick={handleExport}
          disabled={filtered.length === 0}
          label="Export CSV"
        />
      }
      toolbar={
        <>

          <div className="relative w-full lg:max-w-sm">

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leave requests..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">

            <FilterSelect
              value={status}
              onChange={setStatus}
              options={LEAVE_STATUS_OPTIONS}
              placeholder="All Status"
              ariaLabel="Filter by status"
            />

            <FilterSelect
              value={requestType}
              onChange={setRequestType}
              options={LEAVE_REQUEST_TYPES.map((type) => ({
                value: type.value,
                label: type.label,
              }))}
              placeholder="All Types"
              ariaLabel="Filter by request type"
            />

          </div>

        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.requestId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton
        defaultSortBy="requestedAt"
        defaultSortOrder="desc"
        resetKey={`${keyword}|${status}|${requestType}`}
        pageSize={LEAVE_PAGE_SIZE}
        paginationLabel="leave requests"
        /*
        | Grows with the columns that appear at each breakpoint, so a phone
        | scrolls a compact four column table instead of a 1100px one.
        */
        minWidthClass={
          showEmployee
            ? "min-w-[620px] xl:min-w-[960px]"
            : "min-w-[480px] lg:min-w-[620px] xl:min-w-[900px]"
        }
        loadingMessage="Loading leave requests..."
        empty={{
          icon: <FiCalendar size={28} />,
          title: emptyTitle,
          message: emptyMessage,
        }}
      />

    </AttendancePanel>

  );

}

export default LeaveHistoryTable;
