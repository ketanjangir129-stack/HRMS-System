import { useMemo, useState } from "react";
import { FiUsers } from "react-icons/fi";
import { downloadCsv, searchRows } from "../../utils/attendance/attendanceTable";
import {
  AttendancePanel,
  ExportButton,
  FilterSelect,
  MonthNavigator,
} from "./common/AttendancePanel";
import AttendanceRate from "./common/AttendanceRate";
import DataTable from "./common/DataTable";
import EmployeeCell from "./common/EmployeeCell";

/*
|--------------------------------------------------------------------------
| Monthly Attendance Table
|--------------------------------------------------------------------------
| One row per employee with their totals for the selected month. The rows are
| built by `buildMonthlyReport`, so this component only presents them.
|--------------------------------------------------------------------------
*/

const SEARCH_FIELDS = [
  "name",
  "employeeId",
  "department",
  "designation",
];

const EXPORT_HEADER = [
  "Employee ID",
  "Name",
  "Department",
  "Designation",
  "Working Days",
  "Present",
  "Late",
  "Absent",
  "Leave",
  "Attendance Rate (%)",
  "Total Working Hours",
];

const COUNT_STYLES = {
  present: "ring-emerald-200 bg-emerald-50 text-emerald-700",
  late: "ring-amber-200 bg-amber-50 text-amber-700",
  absent: "ring-red-200 bg-red-50 text-red-700",
  leave: "ring-blue-200 bg-blue-50 text-blue-700",
};

function CountPill({ value, tone }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${COUNT_STYLES[tone]}`}
    >
      {value}
    </span>
  );
}

function MonthlyAttendanceTable({
  rows = [],
  loading,
  error,
  onRetry,
  search = "",
  departments = [],
  currentLabel,
  onMonthChange,
  disableNextMonth = false,
  title = "Employee Monthly Attendance",
}) {

  const [departmentFilter, setDepartmentFilter] = useState("");

  const filtered = useMemo(
    () =>
      searchRows(rows, search, SEARCH_FIELDS).filter(
        (row) => !departmentFilter || row.department === departmentFilter
      ),
    [rows, search, departmentFilter]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Employee",
        sortable: true,
        render: (row) => (
          <EmployeeCell name={row.name} employeeId={row.employeeId} />
        ),
      },
      {
        key: "department",
        label: "Department",
        sortable: true,
        render: (row) => (
          <>
            <p className="font-medium text-slate-700">
              {row.department || "--"}
            </p>
            <p className="text-xs text-slate-400">{row.designation || ""}</p>
          </>
        ),
      },
      {
        key: "workingDays",
        label: "Marked Days",
        align: "center",
        sortable: true,
        className: "font-medium",
      },
      {
        key: "present",
        label: "Present",
        align: "center",
        sortable: true,
        render: (row) => <CountPill value={row.present} tone="present" />,
      },
      {
        key: "late",
        label: "Late",
        align: "center",
        sortable: true,
        render: (row) => <CountPill value={row.late} tone="late" />,
      },
      {
        key: "absent",
        label: "Absent",
        align: "center",
        sortable: true,
        render: (row) => <CountPill value={row.absent} tone="absent" />,
      },
      {
        key: "leave",
        label: "Leave",
        align: "center",
        sortable: true,
        render: (row) => <CountPill value={row.leave} tone="leave" />,
      },
      {
        key: "attendanceRate",
        label: "Attendance Rate",
        sortable: true,
        render: (row) => <AttendanceRate value={row.attendanceRate} />,
      },
      {
        key: "workingHours",
        label: "Hours",
        align: "center",
        sortable: true,
        className: "font-medium",
        render: (row) => row.workingHours || "--",
      },
    ],
    []
  );

  const handleExport = () => {

    downloadCsv(
      `monthly-attendance-${String(currentLabel).replace(/\s+/g, "-")}.csv`,
      EXPORT_HEADER,
      filtered.map((row) => [
        row.employeeId,
        row.name,
        row.department,
        row.designation,
        row.workingDays,
        row.present,
        row.late,
        row.absent,
        row.leave,
        row.attendanceRate,
        row.workingHours,
      ])
    );

  };

  return (
    <AttendancePanel
      title={title}
      subtitle={
        search || departmentFilter
          ? `${filtered.length} of ${rows.length} employees for ${currentLabel}`
          : `${rows.length} employees listed for ${currentLabel}`
      }
      toolbar={
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            {onMonthChange && (
              <MonthNavigator
                label={currentLabel}
                onChange={onMonthChange}
                disableNext={disableNextMonth}
              />
            )}

            <FilterSelect
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={departments}
              placeholder="All Departments"
              ariaLabel="Filter by department"
            />

          </div>

          <ExportButton
            onClick={handleExport}
            disabled={filtered.length === 0}
          />
        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.employeeId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingMessage="Loading monthly attendance..."
        defaultSortBy="name"
        resetKey={`${search}|${departmentFilter}|${currentLabel}`}
        paginationLabel="employees"
        minWidthClass="min-w-[1100px]"
        empty={{
          icon: <FiUsers size={28} />,
          title:
            rows.length === 0 ? "No Employees Found" : "No Matching Records",
          message:
            rows.length === 0
              ? "No employees are available in this company."
              : "Try adjusting your search or filter.",
        }}
      />

    </AttendancePanel>
  );

}

export default MonthlyAttendanceTable;
