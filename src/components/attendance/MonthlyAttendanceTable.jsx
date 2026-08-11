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

/*
| Written out in full rather than built from a breakpoint variable: Tailwind
| generates its CSS by scanning the source for literal class names, so an
| interpolated `${bp}:table-cell` would never be emitted.
|
| The breakpoints are read against the width this panel actually gets, not the
| width of the window. The dashboard sidebar is off canvas below `lg` and
| docked from `lg` up, so a 1024px laptop hands the table *less* room than a
| 768px tablet does. Columns therefore appear at `xl` and `2xl`, the first two
| widths where the page really has grown.
*/

const HIDDEN_UNTIL = {
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

const hideBelow = (breakpoint) => ({
  headerClassName: HIDDEN_UNTIL[breakpoint],
  className: HIDDEN_UNTIL[breakpoint],
});

/*
| The same four tones as text only, for the phone card. A filled pill is right
| in a table cell, where it is one mark in a grid of them; stacked down a list
| of employees, four of them per row turn into a block of colour you have to
| read past. Colouring the figure alone keeps a low count findable without the
| card becoming the loudest thing on the screen.
*/
const COUNT_TEXT = {
  present: "text-emerald-600",
  late: "text-amber-600",
  absent: "text-red-600",
  leave: "text-blue-600",
};

/* The four counts, in the order they read on both the table and the card. */
const COUNT_TONES = [
  { key: "present", label: "Present" },
  { key: "late", label: "Late" },
  { key: "absent", label: "Absent" },
  { key: "leave", label: "Leave" },
];

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

  /*
  | Nine columns never fitted on anything narrower than a desktop. Who it is,
  | how much of the month they made and the two counts that decide it stay at
  | every width; the rest drop out as the viewport narrows and are folded back
  | into the employee cell, so nothing is actually lost.
  */
  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Employee",
        sortable: true,
        render: (row) => (
          <div className="min-w-0">

            <EmployeeCell name={row.name} employeeId={row.employeeId} />

            {/*
            | The columns hidden at this width, folded in here. Each span is
            | hidden at exactly the breakpoint where its own column appears,
            | so a value is never shown twice and never missing in between.
            */}
            <p className="mt-1.5 truncate text-xs text-slate-500 2xl:hidden">

              {row.department || "--"}

              {row.designation ? ` · ${row.designation}` : ""}

            </p>

            <p className="mt-0.5 truncate text-xs text-slate-400 2xl:hidden">

              {row.workingDays} marked · {row.workingHours || "--"}

              <span className="xl:hidden">
                {" · "}
                {row.late} late · {row.leave} leave
              </span>

            </p>

          </div>
        ),
      },
      {
        key: "department",
        label: "Department",
        sortable: true,
        ...hideBelow("2xl"),
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
        ...hideBelow("2xl"),
        className: `font-medium ${HIDDEN_UNTIL["2xl"]}`,
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
        ...hideBelow("xl"),
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
        ...hideBelow("xl"),
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
        ...hideBelow("2xl"),
        className: `font-medium whitespace-nowrap ${HIDDEN_UNTIL["2xl"]}`,
        render: (row) => row.workingHours || "--",
      },
    ],
    []
  );

  /*
  | Phones get a card per employee, read top to bottom in the order the
  | question is usually asked: who, how much of the month they made, what the
  | month was made of, and the totals behind it.
  |
  | Four lines of text, no tiles and no boxes. A card is one row of a list
  | here, not a panel, so it is laid out like a list entry: the name is the
  | only thing set large, everything under it is a quiet line, and the rate
  | bar is the single graphic. Anything heavier repeats down the screen once
  | per employee and stops being read.
  */
  const mobileCard = (row) => (
    <div className="space-y-3">

      <EmployeeCell
        name={row.name}
        employeeId={row.employeeId}
        subtitle={
          [row.employeeId, row.department].filter(Boolean).join(" · ")
        }
        size="sm"
      />

      {/* Runs the full width, the figure closing the line at the right edge. */}
      <AttendanceRate
        value={row.attendanceRate}
        barClassName="min-w-0 flex-1"
      />

      {/*
      | One column per count, so the four share the width evenly and the last
      | one ends where the card does. A rule above them separates the month's
      | make up from the identity without drawing a box around either.
      */}
      <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">

        {COUNT_TONES.map((count) => (

          <div key={count.key} className="min-w-0">

            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {count.label}
            </p>

            <p
              className={`mt-0.5 text-sm font-semibold ${COUNT_TEXT[count.key]}`}
            >
              {row[count.key]}
            </p>

          </div>

        ))}

      </div>

      {/* Pushed to opposite edges rather than trailing off mid line. */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-400">

        <span className="truncate">{row.workingDays} marked days</span>

        <span className="shrink-0">{row.workingHours || "--"}</span>

      </div>

    </div>
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
          {/*
          | Stacked on a phone, side by side from `sm`. The department filter is
          | held to a fixed width from `sm` up: a select is sized by its longest
          | option, and one long department name would otherwise push the month
          | navigator and the export button out of the row.
          */}
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">

            {onMonthChange && (
              <MonthNavigator
                label={currentLabel}
                onChange={onMonthChange}
                disableNext={disableNextMonth}
              />
            )}

            <div className="w-full min-w-0 sm:w-52 lg:w-56">
              <FilterSelect
                value={departmentFilter}
                onChange={setDepartmentFilter}
                options={departments}
                placeholder="All Departments"
                ariaLabel="Filter by department"
              />
            </div>

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
        mobileCard={mobileCard}
        /*
        | One floor per column set, each sized to the room the panel has at
        | that width rather than to the widest the table could be. Four columns
        | fit a docked sidebar and a 1024px laptop without a sideways scroll,
        | and the floor only rises where a column is actually added.
        */
        minWidthClass="min-w-[560px] xl:min-w-[820px] 2xl:min-w-[1040px]"
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
