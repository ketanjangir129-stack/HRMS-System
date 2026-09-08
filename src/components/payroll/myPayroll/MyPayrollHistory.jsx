import { useMemo, useState } from "react";
import { FiDownload, FiSearch } from "react-icons/fi";
import { TbReportMoney } from "react-icons/tb";
import {
  AttendancePanel,
  FilterSelect,
} from "../../attendance/common/AttendancePanel";
import DataTable from "../../attendance/common/DataTable";
import { formatCurrency } from "../../../utils/salary/formatCurrency";
import { formatPayrollDate } from "../../../utils/Payroll/payrollDate";
import {
  MONTHS_IN_FINANCIAL_YEAR,
  formatFinancialYear,
  getFinancialYearCalendarYears,
} from "../../../utils/Payroll/financialYear";
import { MY_PAYROLL_STATUS_FILTERS } from "../../../utils/Payroll/myPayroll";
import PayrollStatusBadge from "../common/PayrollStatusBadge";
import MyPayrollHistoryCard from "./MyPayrollHistoryCard";

/*
|--------------------------------------------------------------------------
| My Payroll History
|--------------------------------------------------------------------------
| Every month of the selected financial year the employee was paid for, one
| row each, with the payslip for it.
|
| Filtering stays here while sorting and pagination live in `DataTable`, which
| is the split every attendance, leave and payroll table already uses.
|
| The year filter offers calendar years, not financial ones. A financial year
| spans two of them and the rows are stamped 2026 or 2027, so filtering by the
| financial year would be a filter that never removes a row - the picker in
| the page header already chose it.
|
| Columns are prioritised rather than all forced onto a phone: the month, the
| net pay and the payslip stay at every width, and gross, deductions and the
| status drop out as the viewport narrows. Below `md` even that is too many
| for the width, so the rows are rendered as cards instead - see
| `MyPayrollHistoryCard`, which shows every figure the columns dropped.
|--------------------------------------------------------------------------
*/

/*
| Only `lg`. The table itself does not appear until `md` - below that the rows
| are cards - so a column hidden under `sm` would be a class that never runs.
*/
const HIDDEN_UNTIL = {
  lg: "hidden lg:table-cell",
};

function MyPayrollHistory({
  rows = [],
  financialYear,
  loading = false,
  error = "",
  onRetry,
  onDownload,
  headerSearch = "",
}) {

  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");

  /*
  | The navbar search and this panel's own box filter the same list, so a
  | keyword typed in either place narrows it.
  */
  const keyword = (search || headerSearch).trim().toLowerCase();

  const yearOptions = useMemo(
    () =>
      getFinancialYearCalendarYears(financialYear).map((calendarYear) => ({
        value: String(calendarYear),
        label: String(calendarYear),
      })),
    [financialYear]
  );

  /*
  | The year filter, ignored once it stops belonging to the financial year on
  | screen. Picking 2025 and then moving to FY 2026-27 would otherwise filter
  | every row away and read as a year with no payroll in it.
  |
  | Derived rather than reset by an effect, so the filter heals itself in the
  | same render the year changes in and there is never a frame showing the
  | empty table it would have produced.
  */
  const activeYear = yearOptions.some((option) => option.value === year)
    ? year
    : "";

  const filtered = useMemo(
    () =>
      rows.filter((row) => {

        /*
        | Matched against the month as it is read and as it is stored, so both
        | "august" and "2026-08" find the same row.
        */
        const matchesSearch =
          !keyword ||
          row.monthLabel.toLowerCase().includes(keyword) ||
          row.payrollMonth.toLowerCase().includes(keyword) ||
          row.status.toLowerCase().includes(keyword);

        const matchesYear = !activeYear || row.calendarYear === activeYear;

        const matchesStatus = !status || row.status === status;

        return matchesSearch && matchesYear && matchesStatus;

      }),
    [rows, keyword, activeYear, status]
  );

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

    {
      key: "payrollMonth",
      label: "Month",
      sortable: true,
      /*
      | Sorted on the stored `YYYY-MM` rather than the month's name, which
      | would order a year alphabetically - April, August, December.
      */
      render: (row) => (

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-ink">
            {row.monthLabel}
          </p>

          {/* The pay date has no column of its own; it rides here, where it
              belongs to the month it names. */}
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            Paid {formatPayrollDate(row.payDate)}
          </p>

        </div>

      ),
    },

    {
      key: "gross",
      label: "Gross",
      sortable: true,
      align: "right",
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="text-sm font-medium text-ink-muted">
          {formatCurrency(row.gross)}
        </span>
      ),
    },

    {
      key: "deductions",
      label: "Deduct",
      sortable: true,
      align: "right",
      className: "whitespace-nowrap",
      ...hideBelow("lg"),
      render: (row) => (
        <span className="text-sm font-medium text-rose-600">
          {formatCurrency(row.deductions)}
        </span>
      ),
    },

    {
      key: "netPay",
      label: "Net Pay",
      sortable: true,
      align: "right",
      className: "whitespace-nowrap",
      render: (row) => (
        <span className="text-sm font-bold text-ink">
          {formatCurrency(row.netPay)}
        </span>
      ),
    },

    {
      key: "status",
      label: "Status",
      sortable: true,
      align: "center",
      ...hideBelow("lg"),
      render: (row) => (
        <div className="flex justify-center">
          <PayrollStatusBadge status={row.status} size="sm" />
        </div>
      ),
    },

    {
      key: "actions",
      label: "Payslip",
      align: "right",
      className: "whitespace-nowrap",
      /*
      | Left in place and disabled when the month has not been released, so
      | every row offers the same thing and the reason is on the tooltip.
      | Removing the button would read as a month with no payslip at all.
      */
      render: (row) => (

        <button
          type="button"
          onClick={() => onDownload(row.payrollMonth)}
          disabled={!row.release?.allowed}
          title={
            row.release?.allowed
              ? `Download the payslip for ${row.monthLabel}`
              : row.release?.reason
          }
          className="ui-btn ui-btn-secondary font-semibold"
        >

          <FiDownload size={14} />

          {/* The column is already headed "Payslip"; the word is dropped
              until there is room for it to be worth repeating. */}
          <span className="hidden lg:inline">Payslip</span>

        </button>

      ),
    },

  ];

  return (

    <AttendancePanel
      title="Payroll History"
      subtitle={`Every month you were paid in ${formatFinancialYear(financialYear)}`}
      toolbar={
        <>

          <div className="relative w-full lg:max-w-sm">

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search month or status..."
              aria-label="Search payroll history"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand-ring"
            />

          </div>

          {/* Both filters share one line on a phone rather than taking one
              each: they are short controls and the table is what the screen
              is for. */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">

            <FilterSelect
              value={activeYear}
              onChange={setYear}
              options={yearOptions}
              placeholder="All Years"
              ariaLabel="Filter by year"
            />

            <FilterSelect
              value={status}
              onChange={setStatus}
              options={MY_PAYROLL_STATUS_FILTERS}
              placeholder="All Status"
              ariaLabel="Filter by payroll status"
            />

          </div>

        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.payrollMonth}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton
        defaultSortBy="payrollMonth"
        defaultSortOrder="desc"
        resetKey={`${keyword}|${activeYear}|${status}|${financialYear}`}
        /*
        | A financial year is twelve months, so the whole year fits on one
        | page and the pagination bar only appears once a filter is cleared on
        | a longer list than this screen can produce.
        */
        pageSize={MONTHS_IN_FINANCIAL_YEAR}
        paginationLabel="months"
        mobileCard={(row) => (
          <MyPayrollHistoryCard row={row} onDownload={onDownload} />
        )}
        /* Grows with the columns that appear at each breakpoint, so a narrow
           tablet scrolls a compact table instead of a 900px one. */
        minWidthClass="min-w-[420px] sm:min-w-[560px] lg:min-w-[820px]"
        loadingMessage="Loading your payroll..."
        empty={{
          icon: <TbReportMoney size={28} />,
          title:
            rows.length === 0
              ? "No Payroll History"
              : "No Matching Months",
          message:
            rows.length === 0
              ? `No payroll has been generated for you in ${formatFinancialYear(financialYear)}. Try another financial year.`
              : "No month of this year matches this search or filter.",
        }}
      />

    </AttendancePanel>

  );

}

export default MyPayrollHistory;
