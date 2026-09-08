import { FiCalendar, FiRefreshCw } from "react-icons/fi";
import { formatFinancialYear } from "../../../utils/Payroll/financialYear";

/*
|--------------------------------------------------------------------------
| My Payroll Header
|--------------------------------------------------------------------------
| The page title and the one control the whole page is read through.
|
| Written in the anatomy every dashboard in the product uses: a small brand
| coloured eyebrow carrying the date, the page name at heading size under it,
| then the one line that says what is on the page. No card and no icon tile -
| the heading sits on the page canvas, and a white strip around it would make
| the first thing on the page read as a panel rather than as its title.
|
| The financial year drives everything below it, the same way the month picker
| drives the payroll dashboard and the year selector drives the holidays. It
| sits with the heading rather than in the panels underneath because it is not
| a filter on one of them - the summary, the month card and the history are
| all the same year, and three copies of the same picker would let them
| disagree.
|
| Below `sm` the picker and the refresh take a line of their own under the
| title, which is the "under the header" the layout reads as on a phone.
|--------------------------------------------------------------------------
*/

function MyPayrollHeader({
  financialYear,
  onFinancialYearChange,
  options = [],
  onRefresh,
  loading = false,
  employeeName = "",
}) {

  /*
  | "Monday, 11 August 2026" is too long for a phone once it shares the line
  | with the heading, so the weekday and the full month are dropped below `sm`
  | and the date reads "11 Aug 2026" instead.
  */
  const formatToday = (dateOptions) =>
    new Date().toLocaleDateString("en-US", dateOptions);

  const todayLong = formatToday({
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const todayShort = formatToday({
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (

    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 mb-4 border-b-2 border-gray-200 ">

      <div className="min-w-0">

        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">

          <FiCalendar className="shrink-0" size={14} />

          <span className="truncate">
            <span className="hidden sm:inline">{todayLong}</span>
            <span className="sm:hidden">{todayShort}</span>
          </span>

        </div>

        <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
          My Payroll
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">
          {employeeName
            ? `${employeeName}'s salary and payslips for ${formatFinancialYear(financialYear)}.`
            : `Your salary and payslips for ${formatFinancialYear(financialYear)}.`}
        </p>

      </div>

      {/*
      | On a phone the two controls share one row rather than stacking: the
      | year is a short value and the refresh is an icon with a word, so half
      | a screen is enough for both and the page starts sooner.
      */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

        <select
          value={String(financialYear || "")}
          onChange={(event) => onFinancialYearChange(event.target.value)}
          aria-label="Financial year"
          /*
          | Not `.ui-field`: the kit's field fills its line, and this control
          | is a toolbar item that shrinks to its own width from `sm` up.
          */
          className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring sm:w-auto sm:px-4"
        >

          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}

        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
        >

          <FiRefreshCw className={loading ? "animate-spin" : ""} />

          Refresh

        </button>

      </div>

    </div>

  );

}

export default MyPayrollHeader;
