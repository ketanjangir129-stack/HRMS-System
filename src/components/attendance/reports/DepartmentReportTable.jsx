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

/* The four counts, in the order they read on both the table and the card. */
const COUNTS = [
  { key: "present", label: "Present", tone: "text-emerald-600" },
  { key: "late", label: "Late", tone: "text-amber-600" },
  { key: "absent", label: "Absent", tone: "text-red-600" },
  { key: "leave", label: "Leave", tone: "text-blue-600" },
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

  /*
  | The department, how much of the month it made and the two counts that
  | decide it stay at every width; the rest drop out as the viewport narrows
  | and are folded back under the name, so nothing is actually lost.
  */
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

            <div className="min-w-0">

              <p className="truncate font-semibold text-ink-muted">
                {row.department}
              </p>

              {/*
              | The columns hidden at this width, folded in here. Each span is
              | hidden at exactly the breakpoint where its own column appears,
              | so a value is never shown twice and never missing in between.
              */}
              <p className="mt-0.5 truncate text-xs font-normal text-ink-subtle xl:hidden">

                <span className="lg:hidden">
                  {row.employees} employees ·{" "}
                </span>

                {row.workingDays} marked · {row.workingHours || "--"}

                <span className="lg:hidden">
                  {" · "}
                  {row.late} late · {row.leave} leave
                </span>

              </p>

            </div>

          </div>
        ),
      },
      {
        key: "employees",
        label: "Employees",
        align: "center",
        sortable: true,
        ...hideBelow("lg"),
        className: `font-medium ${HIDDEN_UNTIL.lg}`,
      },
      {
        key: "workingDays",
        label: "Marked Days",
        align: "center",
        sortable: true,
        ...hideBelow("xl"),
        className: `font-medium ${HIDDEN_UNTIL.xl}`,
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
        ...hideBelow("lg"),
        className: `font-semibold text-amber-600 ${HIDDEN_UNTIL.lg}`,
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
        ...hideBelow("lg"),
        className: `font-semibold text-blue-600 ${HIDDEN_UNTIL.lg}`,
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
        ...hideBelow("xl"),
        className: `font-medium whitespace-nowrap ${HIDDEN_UNTIL.xl}`,
      },
    ],
    []
  );

  /*
  | Phones get a card per department, laid out as the monthly card is: who,
  | how much of the month they made, what it was made of, and the totals
  | behind it. The two reports are read one after the other from the same
  | tab strip, so they are the same row at the same rhythm.
  |
  | Four lines of text, no tiles. A card is one row of a list here, not a
  | panel: the name is the only thing set large, the rate bar is the single
  | graphic, and every line runs to both margins rather than stopping short
  | of the right edge.
  */
  const mobileCard = (row) => (
    <div className="space-y-3">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FiGrid size={18} />
        </div>

        <div className="min-w-0">

          <p className="truncate font-semibold text-ink-muted">
            {row.department}
          </p>

          <p className="truncate text-xs text-ink-subtle">
            {row.employees} employees
          </p>

        </div>

      </div>

      {/* Runs the full width, the figure closing the line at the right edge. */}
      <AttendanceRate
        value={row.attendanceRate}
        barClassName="min-w-0 flex-1"
      />

      {/*
      | One column per count, so the four share the width evenly and the last
      | one ends where the card does. A rule above them separates the month's
      | make up from the name without drawing a box around either.
      */}
      <div className="grid grid-cols-4 gap-2 border-t border-line-subtle pt-3">

        {COUNTS.map((count) => (

          <div key={count.key} className="min-w-0">

            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-ink-faint">
              {count.label}
            </p>

            <p className={`mt-0.5 text-sm font-semibold ${count.tone}`}>
              {row[count.key]}
            </p>

          </div>

        ))}

      </div>

      {/* Pushed to opposite edges rather than trailing off mid line. */}
      <div className="flex items-center justify-between gap-3 text-xs text-ink-faint">

        <span className="truncate">{row.workingDays} marked days</span>

        <span className="shrink-0">{row.workingHours || "--"}</span>

      </div>

    </div>
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
        mobileCard={mobileCard}
        /*
        | Grows with the columns that appear at each breakpoint, so a tablet
        | scrolls a compact four column table instead of a 1000px one.
        */
        minWidthClass="min-w-[560px] lg:min-w-[800px] xl:min-w-[1000px]"
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
