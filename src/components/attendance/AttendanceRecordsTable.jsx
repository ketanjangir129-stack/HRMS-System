import { useMemo, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { ATTENDANCE_STATUS_OPTIONS } from "../../utils/attendance/attendanceConstants";
import { formatTime } from "../../utils/attendance/attendanceDate";
import { downloadCsv, searchRows } from "../../utils/attendance/attendanceTable";
import {
  AttendancePanel,
  ExportButton,
  FilterSelect,
  LiveBadge,
} from "./common/AttendancePanel";
import AttendanceStatusBadge from "./common/AttendanceStatusBadge";
import DataTable from "./common/DataTable";
import EmployeeCell from "./common/EmployeeCell";

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
  "Remarks",
];

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
  emptyMessage = "No employee has punched in for this day.",
}) {

  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const filtered = useMemo(
    () =>
      searchRows(records, search, SEARCH_FIELDS).filter((record) => {

        const matchesStatus =
          !statusFilter || record.status === statusFilter;

        const matchesDepartment =
          !departmentFilter || record.department === departmentFilter;

        return matchesStatus && matchesDepartment;

      }),
    [records, search, statusFilter, departmentFilter]
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
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (record) => (
          <AttendanceStatusBadge status={record.status} />
        ),
      },
    ],
    []
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
        record.remarks || "",
      ])
    );

  };

  const toolbar =
    showFilters || showExport ? (
      <>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-2">

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
        resetKey={`${search}|${statusFilter}|${departmentFilter}`}
        paginationLabel="records"
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint, so a tablet
        | scrolls a compact four column table instead of a 900px one.
        */
        minWidthClass="min-w-[560px] lg:min-w-[720px] xl:min-w-[900px]"
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

    </AttendancePanel>
  );

}

export default AttendanceRecordsTable;
