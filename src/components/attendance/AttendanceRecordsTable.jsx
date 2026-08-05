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

  const columns = useMemo(
    () => [
      {
        key: "employeeName",
        label: "Employee",
        sortable: true,
        render: (record) => (
          <EmployeeCell
            name={record.employeeName}
            employeeId={record.employeeId}
          />
        ),
      },
      {
        key: "department",
        label: "Department",
        sortable: true,
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
        className: "font-medium",
        render: (record) => formatTime(record.punchIn),
      },
      {
        key: "punchOut",
        label: "Punch Out",
        sortable: true,
        className: "font-medium",
        render: (record) => formatTime(record.punchOut),
      },
      {
        key: "workingHours",
        label: "Working Hours",
        render: (record) => (
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-2">

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
