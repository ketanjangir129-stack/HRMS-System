import { useCallback, useMemo, useState } from "react";
import { FiCalendar, FiCheck, FiMapPin, FiX } from "react-icons/fi";
import {
  APPROVAL_STATUS,
  APPROVAL_STATUS_OPTIONS,
  ATTENDANCE_STATUS_OPTIONS,
} from "../../utils/attendance/attendanceConstants";
import { formatTime } from "../../utils/attendance/attendanceDate";
import { downloadCsv, searchRows } from "../../utils/attendance/attendanceTable";
import {
  getApprovalLabel,
  getApprovalStatus,
} from "../../utils/attendance/attendanceUtils";
import {
  AttendancePanel,
  ExportButton,
  FilterSelect,
  LiveBadge,
} from "./common/AttendancePanel";
import AttendanceStatusBadge from "./common/AttendanceStatusBadge";
import DataTable from "./common/DataTable";
import EmployeeCell from "./common/EmployeeCell";
import LocationModal from "./LocationModal";

/*
|--------------------------------------------------------------------------
| Attendance Records Table
|--------------------------------------------------------------------------
| One day of attendance, one row per employee. Used by the dashboard, the
| daily attendance page and the daily report, so the columns and the empty
| states stay identical wherever a day is listed.
|
| Records arrive already joined with the employee directory: the stored
| record itself only knows the employee id.
|--------------------------------------------------------------------------
*/

const SEARCH_FIELDS = [
  "employeeName",
  "employeeId",
  "department",
  "designation",
];

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
| A day can carry a punch in location, a punch out location or both. The
| location is offered on the node existing rather than on which punch
| recorded it - the modal is where that is told apart.
*/
const hasLocation = (record) =>
  Boolean(record.location?.punchIn) || Boolean(record.location?.punchOut);

/*
| The approval travels with the day in the export too. A sheet of attendance
| that does not say which days were signed off is the same sheet as before
| daily approval existed, and payroll cannot tell the difference.
*/

const EXPORT_HEADER = [
  "Employee ID",
  "Employee Name",
  "Department",
  "Designation",
  "Date",
  "Punch In",
  "Punch Out",
  "Working Hours",
  "Status",
  "Approval",
  "Approved By",
  "Approval Remarks",
  "Remarks",
];

/*
|--------------------------------------------------------------------------
| Approval Cell
|--------------------------------------------------------------------------
| The decision on a day, and the two buttons that make it.
|
| Both buttons are always offered to a reviewer, each disabled on the state
| the day is already in. A decision can be revisited - a day approved at nine
| can turn out at eleven to have been nobody's day at all - and hiding the
| buttons the moment a day is decided is what would make that impossible.
|
| Who counts as a reviewer can differ from row to row. HR reviews the whole
| day; a manager reviews their own departments and not their own record, so
| `canReview` is read as a predicate when one is given and as a plain boolean
| when it is not. The buttons are left out rather than disabled for a row that
| is not theirs to decide: a disabled control says "not yet", and this is
| "not yours".
|--------------------------------------------------------------------------
*/

const REVIEW_BUTTON =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-40";

/*
| A table cell is read with a mouse and a card is tapped with a thumb, so the
| buttons are sized for whichever is being used. 28px is as much as a row of a
| dense table can give a button without pushing the row taller than the rest;
| on a card there is no such constraint and no excuse for a target that small.
*/

const REVIEW_BUTTON_SIZE = {
  md: "h-7 w-7",
  sm: "h-9 w-9",
};

function ApprovalCell({ record, approval, size = "md" }) {

  const label = getApprovalLabel(record);

  /*
  | Nothing was ever recorded for this day, so there is nothing to decide.
  */
  if (!label) {
    return <span className="text-sm text-slate-400">--</span>;
  }

  const status = getApprovalStatus(record);

  const canReview =
    typeof approval.canReview === "function"
      ? approval.canReview(record)
      : Boolean(approval.canReview);

  const busy =
    approval.busyKey === `${record.date}-${record.employeeId}`;

  const buttonClass = `${REVIEW_BUTTON} ${REVIEW_BUTTON_SIZE[size] || REVIEW_BUTTON_SIZE.md}`;

  const iconSize = size === "sm" ? 16 : 14;

  return (
    <div className="flex items-center gap-2">

      <AttendanceStatusBadge
        status={label}
        variant="approval"
        size={size}
      />

      {canReview && (

        <span className="flex shrink-0 items-center gap-1">

          <button
            type="button"
            title="Approve this day"
            aria-label="Approve this day"
            disabled={busy || status === APPROVAL_STATUS.APPROVED}
            onClick={() => approval.onApprove(record)}
            className={`${buttonClass} border-emerald-200 text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-200`}
          >
            <FiCheck size={iconSize} />
          </button>

          <button
            type="button"
            title="Reject this day"
            aria-label="Reject this day"
            disabled={busy || status === APPROVAL_STATUS.REJECTED}
            onClick={() => approval.onReject(record)}
            className={`${buttonClass} border-red-200 text-red-600 hover:bg-red-50 focus:ring-red-200`}
          >
            <FiX size={iconSize} />
          </button>

        </span>

      )}

    </div>
  );

}

/*
| `approval` turns the column on:
|
|   { canReview, onApprove, onReject, busyKey }
|
| Left out, the table is exactly the table it was before - which is how the
| report views, where a day is being read rather than decided, keep their
| existing columns.
*/

function AttendanceRecordsTable({
  records = [],
  loading = false,
  error = "",
  onRetry,
  search = "",
  title = "Today's Attendance",
  subtitle = "Live attendance status of employees",
  live = false,
  departments = [],
  showFilters = true,
  showExport = true,
  exportName = "attendance",
  footer = null,
  approval = null,
  emptyMessage = "No employee has punched in for this day.",
}) {

  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");

  /*
  | The row whose location is being shown. The record itself is held rather
  | than an id: it already carries both punch locations and the employee
  | name, so nothing has to be looked up again.
  */
  const [locationRecord, setLocationRecord] = useState(null);

  /*
  | Shared by the column and the mobile card. Below `md` the table is not
  | rendered at all - only the card is - so a button that lives solely in a
  | column is a button a phone never gets, and the location modal has no way
  | to be opened there.
  |
  | Offered on the location node existing rather than on which punch recorded
  | it: a day can carry a punch in location, a punch out location or both, and
  | the modal is where that is told apart.
  */
  const viewLocationButton = useCallback(
    (record) => (
      <button
        type="button"
        onClick={() => setLocationRecord(record)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <FiMapPin />
        View
      </button>
    ),
    []
  );

  const filtered = useMemo(
    () =>
      searchRows(records, search, SEARCH_FIELDS).filter((record) => {

        const matchesStatus =
          !statusFilter || record.status === statusFilter;

        const matchesDepartment =
          !departmentFilter || record.department === departmentFilter;

        /*
        | Filtered on the resolved decision rather than the stored field, so
        | "Approved" also finds the days recorded before daily approval
        | existed - which is how they are being counted.
        */
        const matchesApproval =
          !approvalFilter ||
          getApprovalStatus(record) === approvalFilter;

        return matchesStatus && matchesDepartment && matchesApproval;

      }),
    [records, search, statusFilter, departmentFilter, approvalFilter]
  );

  /*
  | Columns are prioritised rather than all forced onto a narrow screen. Who
  | it is, when they came and went, and how the day ended up stay at every
  | width; the department and the hours drop out as the viewport narrows and
  | are folded back into the employee cell, so nothing is actually lost.
  */
  const columns = useMemo(
    () => [
      {
        key: "employeeName",
        label: "Employee",
        sortable: true,
        render: (record) => (
          <div className="min-w-0">

            <EmployeeCell
              name={record.employeeName}
              employeeId={record.employeeId}
            />

            {/*
            | The columns hidden at this width, folded in here. Each span is
            | hidden at exactly the breakpoint where its own column appears,
            | so a value is never shown twice and never missing in between.
            */}
            <p className="mt-1.5 truncate text-xs text-slate-500 xl:hidden">

              {record.department || "--"}

              {record.designation ? ` · ${record.designation}` : ""}

              <span className="lg:hidden">
                {" · "}
                {record.workingHours || "--"}
              </span>

            </p>

          </div>
        ),
      },
      {
        key: "department",
        label: "Department",
        sortable: true,
        ...hideBelow("xl"),
        render: (record) => (
          <>
            <p className="font-medium text-slate-700">
              {record.department || "--"}
            </p>
            <p className="text-xs text-slate-400">
              {record.designation || ""}
            </p>
          </>
        ),
      },
      {
        key: "punchIn",
        label: "Punch In",
        sortable: true,
        className: "font-medium whitespace-nowrap",
        render: (record) => formatTime(record.punchIn),
      },
      {
        key: "punchOut",
        label: "Punch Out",
        sortable: true,
        className: "font-medium whitespace-nowrap",
        render: (record) => formatTime(record.punchOut),
      },
      {
        key: "workingHours",
        label: "Working Hours",
        ...hideBelow("lg"),
        render: (record) => (
          <span className="inline-flex whitespace-nowrap rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {record.workingHours || "--"}
          </span>
        ),
      },
      /*
      | Not sortable - there is nothing meaningful to order coordinates by.
      */
      {
        key: "location",
        label: "Location",
        className: "whitespace-nowrap",
        render: (record) =>
          hasLocation(record) ? viewLocationButton(record) : "--",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (record) => (
          <AttendanceStatusBadge status={record.status} />
        ),
      },
      /*
      | Sorted on the stored field rather than the resolved one, which puts
      | the days waiting on a decision together at one end of the list: the
      | order the column is most often clicked for.
      */
      ...(approval
        ? [
          {
            key: "approvalStatus",
            label: "Approval",
            sortable: true,
            className: "whitespace-nowrap",
            render: (record) => (
              <ApprovalCell record={record} approval={approval} />
            ),
          },
        ]
        : []),
    ],
    [approval, viewLocationButton]
  );

  /*
  | Phones get a card per employee instead of a six column table dragged
  | sideways: the identity on top with the day's status beside it, and the
  | three times below as a row of their own.
  */
  const mobileCard = (record) => (
    <div className="space-y-3">

      <div className="flex items-start justify-between gap-3">

        <EmployeeCell
          name={record.employeeName}
          employeeId={record.employeeId}
          subtitle={record.department || record.employeeId}
          size="sm"
        />

        <span className="shrink-0">
          <AttendanceStatusBadge status={record.status} size="sm" />
        </span>

      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5">

        {[
          { label: "In", value: formatTime(record.punchIn) },
          { label: "Out", value: formatTime(record.punchOut) },
          { label: "Hours", value: record.workingHours || "--" },
        ].map((item) => (

          <div key={item.label} className="min-w-0">

            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </p>

            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
              {item.value}
            </p>

          </div>

        ))}

      </div>

      {/*
      | The table is not rendered below `md` at all, so the Location column
      | never reaches a phone and the button has to be offered here too -
      | otherwise the location modal is unreachable on the screen where the
      | punches were actually made.
      |
      | A row of its own, the same shape as the approval row below: a label
      | on the left and the control on the right, rather than a fourth cell
      | squeezed into the three column times grid.
      */}
      {hasLocation(record) && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">

          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Location
          </p>

          {viewLocationButton(record)}

        </div>
      )}

      {/*
      | The decision gets its own line on a phone rather than being squeezed
      | in beside the status: with the two review buttons next to it, it is a
      | row of its own and not a value.
      */}
      {approval && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">

          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Approval
          </p>

          <ApprovalCell
            record={record}
            approval={approval}
            size="sm"
          />

        </div>
      )}

    </div>
  );

  const handleExport = () => {

    downloadCsv(
      `${exportName}.csv`,
      EXPORT_HEADER,
      filtered.map((record) => [
        record.employeeId,
        record.employeeName,
        record.department,
        record.designation,
        record.date,
        formatTime(record.punchIn),
        formatTime(record.punchOut),
        record.workingHours || "--",
        record.status,
        getApprovalLabel(record) || "--",
        record.approvedBy || "",
        record.approvalRemarks || "",
        record.remarks || "",
      ])
    );

  };

  const toolbar =
    showFilters || showExport || approval ? (
      <>
        <div
          className={`grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto ${approval ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
        >

          {showFilters && (
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={ATTENDANCE_STATUS_OPTIONS}
              placeholder="All Status"
              ariaLabel="Filter by status"
            />
          )}

          {showFilters && departments.length > 0 && (
            <FilterSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departments}
              placeholder="All Departments"
              ariaLabel="Filter by department"
            />
          )}

          {/*
          | Offered whenever the column is, filters or not: picking the days
          | still waiting on a decision out of a full day of attendance is the
          | whole job, and scrolling for them is not a way to do it.
          */}
          {approval && (
            <FilterSelect
              value={approvalFilter}
              onChange={setApprovalFilter}
              options={APPROVAL_STATUS_OPTIONS}
              placeholder="All Approvals"
              ariaLabel="Filter by approval"
            />
          )}

        </div>

        {showExport && (
          <ExportButton
            onClick={handleExport}
            disabled={filtered.length === 0}
          />
        )}
      </>
    ) : null;

  return (
    <AttendancePanel
      title={title}
      subtitle={subtitle}
      action={live ? <LiveBadge /> : null}
      toolbar={toolbar}
      className="h-full"
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(record) => `${record.date}-${record.employeeId}`}
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingMessage="Loading attendance..."
        defaultSortBy="employeeName"
        resetKey={`${search}|${statusFilter}|${departmentFilter}|${approvalFilter}`}
        paginationLabel="records"
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint, so a tablet
        | scrolls a compact four column table instead of a 900px one. The
        | approval column adds a badge and two buttons, so each floor rises
        | with it rather than the times being squeezed to make room.
        */
        minWidthClass={
          approval
            ? "min-w-[720px] lg:min-w-[880px] xl:min-w-[1060px]"
            : "min-w-[560px] lg:min-w-[720px] xl:min-w-[900px]"
        }
        empty={{
          icon: <FiCalendar size={28} />,
          title:
            records.length === 0
              ? "No Attendance Found"
              : "No Matching Records",
          message:
            records.length === 0
              ? emptyMessage
              : "Try another search or filter.",
        }}
      />

      {footer}

      <LocationModal
        open={Boolean(locationRecord)}
        record={locationRecord}
        onClose={() => setLocationRecord(null)}
      />

    </AttendancePanel>
  );

}

export default AttendanceRecordsTable;
