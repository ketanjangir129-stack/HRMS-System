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

          <p className="font-semibold text-ink-muted">
            {formatLeaveRange(row)}
          </p>

          {/* <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {row.requestId}
          </p> */}

          {/*
          | The columns hidden at this width, folded in here. Each span is
          | hidden at exactly the breakpoint where its own column appears, so
          | a value is never shown twice and never missing in between.
          */}
          <p className="mt-1 text-xs text-ink-subtle xl:hidden">

            {formatLeaveType(row)}

            {hasColumn("days") && (
              <span className="lg:hidden">
                {" · "}
                {formatLeaveDuration(row.days)}
              </span>
            )}

          </p>

          <p className="mt-0.5 text-xs text-ink-faint xl:hidden">
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
        <span className="text-sm text-ink-muted">
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
        <span className="inline-flex whitespace-nowrap rounded-lg bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink-muted">
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
          className="line-clamp-2 max-w-[240px] text-sm text-ink-muted"
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
        <span className="whitespace-nowrap text-sm text-ink-muted">
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
            <span className="max-w-[120px] truncate text-[11px] text-ink-faint">
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

  /*
  |--------------------------------------------------------------------------
  | Mobile
  |--------------------------------------------------------------------------
  | Below `md` the same request is a stacked card instead of a row. Six
  | columns in a 360px viewport is a sideways scroll through every record,
  | and the one thing this list is read for - what happened to which days -
  | is what ends up off screen.
  |
  | The card leads with whatever identifies the request on this screen: the
  | employee on the approval queue, the dates on an employee's own history.
  | The status sits opposite it, because that is what the list is scanned
  | for. Everything else is grouped into the tinted block below.
  |
  | `hasColumn` is honoured here as well, so a column the caller dropped on
  | purpose is not quietly reintroduced on a phone.
  */

  const mobileCard = (row) => (

    <div className="space-y-3">

      <div className="flex items-start justify-between gap-3">

        {showEmployee ? (

          <EmployeeCell
            name={row.employeeName}
            employeeId={row.employeeId}
            subtitle={row.department}
            size="sm"
          />

        ) : (

          <div className="min-w-0">

            <p className="text-sm font-semibold text-ink-muted">
              {formatLeaveRange(row)}
            </p>

            <p className="mt-0.5 text-xs text-ink-faint">
              Applied {formatDateTime(row.requestedAt)}
            </p>

          </div>

        )}

        <div className="flex shrink-0 flex-col items-end gap-1">

          <LeaveStatusBadge status={row.status} size="sm" />

          {row.approvedBy && (
            <span className="max-w-28 truncate text-[11px] text-ink-faint">
              by {row.approvedBy}
            </span>
          )}

        </div>

      </div>

      <div className="space-y-1.5 rounded-xl bg-surface-muted px-3 py-2.5">

        {/* Only when the employee took the top line above. */}
        {showEmployee && (
          <p className="text-xs font-semibold text-ink-muted">
            {formatLeaveRange(row)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">

          <span className="inline-flex whitespace-nowrap rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line">
            {formatLeaveType(row)}
          </span>

          {hasColumn("days") && (
            <span className="text-xs font-medium text-ink-muted">
              {formatLeaveDuration(row.days)}
            </span>
          )}

        </div>

        {hasColumn("reason") && (
          <p className="line-clamp-2 text-xs text-ink-subtle">
            {row.reason || "--"}
          </p>
        )}

        {showEmployee && (
          <p className="text-xs text-ink-faint">
            Applied {formatDateTime(row.requestedAt)}
          </p>
        )}

      </div>

      {renderActions && (
        <div className="flex items-center justify-end">
          {renderActions(row)}
        </div>
      )}

    </div>

  );

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

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search leave requests..."
              /*
              | Not `.ui-field`: the kit sets its own padding, and this box has
              | to leave room on the left for the search icon sitting inside it.
              */
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand-ring"
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
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint. The table
        | itself now only starts at `md`, where there is room for it, so the
        | narrowest width it has to fit is a tablet's rather than a phone's.
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
