import { useMemo } from "react";
import { FiUser } from "react-icons/fi";
import {
  formatDayLabel,
  formatTime,
} from "../../../utils/attendance/attendanceDate";
import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import {
  AttendancePanel,
  ExportButton,
} from "../common/AttendancePanel";
import AttendanceStatusBadge from "../common/AttendanceStatusBadge";
import DataTable from "../common/DataTable";

/*
|--------------------------------------------------------------------------
| Employee Report
|--------------------------------------------------------------------------
| A single employee's month, one row per day. Days with no record are
| reported as Absent by `buildEmployeeReport`, so gaps stay visible.
|--------------------------------------------------------------------------
*/

const EXPORT_HEADER = [
  "Date",
  "Punch In",
  "Punch Out",
  "Working Hours",
  "Status",
  "Remarks",
];

function EmployeeReportTable({
  rows = [],
  employee,
  monthLabel,
  loading,
  error,
  onRetry,
  toolbar,
}) {

  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        sortable: true,
        className: "font-semibold text-slate-800 whitespace-nowrap",
        render: (row) => formatDayLabel(row.date),
      },
      {
        key: "punchIn",
        label: "Punch In",
        sortable: true,
        render: (row) => formatTime(row.punchIn),
      },
      {
        key: "punchOut",
        label: "Punch Out",
        sortable: true,
        render: (row) => formatTime(row.punchOut),
      },
      {
        key: "workingHours",
        label: "Working Hours",
        render: (row) => (
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {row.workingHours || "--"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) => <AttendanceStatusBadge status={row.status} />,
      },
      {
        key: "remarks",
        label: "Remarks",
        render: (row) => row.remarks || "--",
      },
    ],
    []
  );

  const handleExport = () => {

    downloadCsv(
      `employee-attendance-${employee?.employeeId || "report"}-${String(monthLabel).replace(/\s+/g, "-")}.csv`,
      EXPORT_HEADER,
      rows.map((row) => [
        row.date,
        formatTime(row.punchIn),
        formatTime(row.punchOut),
        row.workingHours || "--",
        row.status,
        row.remarks || "",
      ])
    );

  };

  return (
    <AttendancePanel
      title={
        employee ? `${employee.name} · ${employee.employeeId}` : "Employee Report"
      }
      subtitle={
        employee
          ? `${[employee.department, employee.designation].filter(Boolean).join(" · ") || "Day by day attendance"} — ${monthLabel}`
          : "Select an employee to see their day by day attendance"
      }
      action={
        <ExportButton
          onClick={handleExport}
          disabled={!employee || rows.length === 0}
        />
      }
      toolbar={toolbar}
    >

      <DataTable
        columns={columns}
        rows={employee ? rows : []}
        rowKey={(row) => row.date}
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingMessage="Loading employee attendance..."
        defaultSortBy="date"
        defaultSortOrder="desc"
        resetKey={`${employee?.employeeId || ""}|${monthLabel}`}
        paginationLabel="days"
        minWidthClass="min-w-[800px]"
        empty={{
          icon: <FiUser size={28} />,
          title: employee ? "No Attendance Records" : "No Employee Selected",
          message: employee
            ? `No attendance was recorded for ${employee.name} in ${monthLabel}.`
            : "Choose an employee to see their attendance for the month.",
        }}
      />

    </AttendancePanel>
  );

}

export default EmployeeReportTable;
