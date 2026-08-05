import { useMemo } from "react";
import { FiGrid } from "react-icons/fi";
import { downloadCsv, searchRows } from "../../../utils/attendance/attendanceTable";
import {
  AttendancePanel,
  ExportButton,
} from "../common/AttendancePanel";
import AttendanceRate from "../common/AttendanceRate";
import DataTable from "../common/DataTable";

/*
|--------------------------------------------------------------------------
| Department Report
|--------------------------------------------------------------------------
| The monthly rows rolled up per department by `buildDepartmentReport`.
|--------------------------------------------------------------------------
*/

const EXPORT_HEADER = [
  "Department",
  "Employees",
  "Marked Days",
  "Present",
  "Late",
  "Absent",
  "Leave",
  "Attendance Rate (%)",
  "Total Working Hours",
];

function DepartmentReportTable({
  rows = [],
  monthLabel,
  search = "",
  loading,
  error,
  onRetry,
  toolbar,
}) {

  const filtered = useMemo(
    () => searchRows(rows, search, ["department"]),
    [rows, search]
  );

  const columns = useMemo(
    () => [
      {
        key: "department",
        label: "Department",
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FiGrid size={18} />
            </div>

            <p className="font-semibold text-slate-800">{row.department}</p>

          </div>
        ),
      },
      {
        key: "employees",
        label: "Employees",
        align: "center",
        sortable: true,
        className: "font-medium",
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
        className: "font-semibold text-emerald-600",
      },
      {
        key: "late",
        label: "Late",
        align: "center",
        sortable: true,
        className: "font-semibold text-amber-600",
      },
      {
        key: "absent",
        label: "Absent",
        align: "center",
        sortable: true,
        className: "font-semibold text-red-600",
      },
      {
        key: "leave",
        label: "Leave",
        align: "center",
        sortable: true,
        className: "font-semibold text-blue-600",
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
      },
    ],
    []
  );

  const handleExport = () => {

    downloadCsv(
      `department-attendance-${String(monthLabel).replace(/\s+/g, "-")}.csv`,
      EXPORT_HEADER,
      filtered.map((row) => [
        row.department,
        row.employees,
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
      title="Department Report"
      subtitle={`Attendance rolled up per department for ${monthLabel}`}
      action={
        <ExportButton
          onClick={handleExport}
          disabled={filtered.length === 0}
        />
      }
      toolbar={toolbar}
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.department}
        loading={loading}
        error={error}
        onRetry={onRetry}
        loadingMessage="Loading department report..."
        defaultSortBy="department"
        resetKey={`${search}|${monthLabel}`}
        paginationLabel="departments"
        minWidthClass="min-w-[1000px]"
        empty={{
          icon: <FiGrid size={28} />,
          title:
            rows.length === 0
              ? "No Department Data"
              : "No Matching Departments",
          message:
            rows.length === 0
              ? `No attendance was recorded in ${monthLabel}.`
              : "Try another search.",
        }}
      />

    </AttendancePanel>
  );

}

export default DepartmentReportTable;
