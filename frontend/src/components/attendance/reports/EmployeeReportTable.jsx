import { useMemo } from "react";
import { FiUser } from "react-icons/fi";
import {
  formatDayLabel,
  formatTime,
} from "../../../utils/attendance/attendanceDate";
import { downloadCsv } from "../../../utils/attendance/attendanceTable";
import { getApprovalLabel } from "../../../utils/attendance/attendanceUtils";
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
  "Approval",
  "Approved By",
  "Remarks",
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

function EmployeeReportTable({
  rows = [],
  employee,
  monthLabel,
  loading,
  error,
  onRetry,
  toolbar,
}) {

  /*
  | The day, its two punches and how it ended up stay at every width; the
  | hours and the remark drop out as the viewport narrows and are folded back
  | under the date, so nothing is actually lost.
  */
  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        sortable: true,
        className: "font-semibold text-ink-muted",
        render: (row) => (
          <div className="min-w-0">

            <p className="whitespace-nowrap">{formatDayLabel(row.date)}</p>

            {/*
            | The columns hidden at this width, folded in here. Each span is
            | hidden at exactly the breakpoint where its own column appears,
            | so a value is never shown twice and never missing in between.
            */}
            <p className="mt-1 truncate text-xs font-medium text-ink-subtle lg:hidden">
              {row.workingHours || "--"}
            </p>

            {row.remarks && (
              <p className="mt-0.5 line-clamp-1 text-xs font-normal text-ink-faint xl:hidden">
                {row.remarks}
              </p>
            )}

          </div>
        ),
      },
      {
        key: "punchIn",
        label: "Punch In",
        sortable: true,
        className: "whitespace-nowrap",
        render: (row) => formatTime(row.punchIn),
      },
      {
        key: "punchOut",
        label: "Punch Out",
        sortable: true,
        className: "whitespace-nowrap",
        render: (row) => formatTime(row.punchOut),
      },
      {
        key: "workingHours",
        label: "Working Hours",
        ...hideBelow("lg"),
        render: (row) => (
          <span className="inline-flex whitespace-nowrap rounded-lg bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-muted">
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
      /*
      | Whether the day has been signed off, and why not if it was turned
      | down. A day that was rejected is the one an employee has to see: it is
      | not counting towards their month, and the remark is what tells them
      | what to raise a correction about.
      */
      {
        key: "approvalStatus",
        label: "Approval",
        sortable: true,
        className: "whitespace-nowrap",
        render: (row) => (
          <AttendanceStatusBadge
            status={getApprovalLabel(row)}
            variant="approval"
          />
        ),
      },
      {
        key: "remarks",
        label: "Remarks",
        ...hideBelow("xl"),
        render: (row) => row.approvalRemarks || row.remarks || "--",
      },
    ],
    []
  );

  /*
  | Phones get a card per day: the date and its status on top, the two punches
  | and the hours below, and the remark only when there is one.
  */
  const mobileCard = (row) => (
    <div className="space-y-3">

      <div className="flex items-center justify-between gap-3">

        <p className="min-w-0 truncate text-sm font-semibold text-ink-muted">
          {formatDayLabel(row.date)}
        </p>

        <span className="shrink-0">
          <AttendanceStatusBadge status={row.status} size="sm" />
        </span>

      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted px-3 py-2.5">

        {[
          { label: "In", value: formatTime(row.punchIn) },
          { label: "Out", value: formatTime(row.punchOut) },
          { label: "Hours", value: row.workingHours || "--" },
        ].map((item) => (

          <div key={item.label} className="min-w-0">

            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              {item.label}
            </p>

            <p className="mt-0.5 truncate text-sm font-semibold text-ink-muted">
              {item.value}
            </p>

          </div>

        ))}

      </div>

      {/*
      | Its own line rather than a second badge beside the date. Two pills up
      | there push the date into an ellipsis on a narrow phone, and the date is
      | what the row is: a day of the month, not the widest thing that fits
      | after the badges have taken their share.
      */}
      {getApprovalLabel(row) && (
        <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3">

          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Approval
          </p>

          <AttendanceStatusBadge
            status={getApprovalLabel(row)}
            variant="approval"
            size="sm"
          />

        </div>
      )}

      {(row.approvalRemarks || row.remarks) && (
        <p className="wrap-break-word text-xs text-ink-subtle">
          {row.approvalRemarks || row.remarks}
        </p>
      )}

    </div>
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
        getApprovalLabel(row) || "--",
        row.approvedBy || "",
        row.approvalRemarks || row.remarks || "",
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
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint, so a tablet
        | scrolls a compact four column table instead of an 800px one.
        */
        minWidthClass="min-w-[640px] lg:min-w-[780px] xl:min-w-[940px]"
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
