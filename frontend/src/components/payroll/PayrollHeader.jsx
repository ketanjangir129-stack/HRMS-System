import { FiCalendar, FiPlayCircle, FiRefreshCw } from "react-icons/fi";
import { formatPayrollMonth } from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Header
|--------------------------------------------------------------------------
| The dashboard toolbar: the month every panel below is read for, a refresh,
| and the run that generates the whole month.
|
| Written in the same anatomy the main Dashboard uses: a small brand coloured
| eyebrow carrying the date, the page name at heading size under it, then the
| one line that says what the page is for.
|
| No card and no filled icon tile. The Dashboard sets its heading directly on
| the page canvas, and a white strip around this one made the first thing on
| the page read as a panel of its own rather than as the page's title.
|
| Payroll is filed per month, so the month picker drives the entire page in
| the same way the year selector drives the holiday dashboard.
|
| The run button goes grey for five different reasons - the month has not
| started, everybody is done, there is nobody to run, the month has been
| closed, or the signed in user may not run payroll - so it always says which
| one it is rather than going grey without a word.
|
| `generateGate` is the answer the dashboard already worked out from the run
| and the user's permissions. The button does not re-derive it: the same gate
| is what the service checks before it writes, so a hidden button and a
| refused write can never give different reasons.
|--------------------------------------------------------------------------
*/

function PayrollHeader({
  payrollMonth,
  setPayrollMonth,
  onGenerateAll,
  onRefresh,
  loading = false,
  generatingAll = false,
  isFutureMonth = false,
  pendingCount = 0,
  totalEmployees = 0,
  generateGate = { allowed: true, reason: "" },
}) {

  const busy = loading || generatingAll;

  const nothingToRun = pendingCount === 0 && totalEmployees > 0;

  const runDisabled =
    busy ||
    isFutureMonth ||
    totalEmployees === 0 ||
    nothingToRun ||
    !generateGate.allowed;

  /*
  | The state of the month is named before the state of the run: "this month
  | has not started yet" is the more useful thing to be told, and a future
  | month is never generated whatever the run says.
  */

  const runHint = isFutureMonth
    ? "This month has not started yet."
    : totalEmployees === 0
      ? "There is no one to generate payroll for."
      : !generateGate.allowed
        ? generateGate.reason
        : nothingToRun
          ? "Every employee has already been generated."
          : "";

  /*
  | "Monday, 11 August 2026" is too long for a phone once it shares the line
  | with the heading, so the weekday and the full month are dropped below
  | `sm` and the date reads "11 Aug 2026" instead.
  */
  const formatToday = (options) =>
    new Date().toLocaleDateString("en-US", options);

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

    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      <div className="min-w-0">

        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">

          <FiCalendar className="shrink-0" size={14} />

          <span className="truncate">
            <span className="hidden sm:inline">{todayLong}</span>
            <span className="sm:hidden">{todayShort}</span>
          </span>

        </div>

        <h1 className="text-2xl font-bold text-ink wrap-break-word sm:text-3xl">
          Payroll Dashboard
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">
          {totalEmployees > 0
            ? `${totalEmployees - pendingCount} of ${totalEmployees} generated for ${formatPayrollMonth(payrollMonth)}.`
            : "Generate and review the monthly payroll run."}
        </p>

      </div>

      {/*
      | On a phone the controls are a two column grid rather than a wrapped
      | row: the month and the refresh share a line, and the run takes a line
      | of its own, so "Generate Payroll" is a full width target instead of
      | whatever width happens to be left over at the end of a wrap.
      |
      | `col-span-2` is a grid property, so it is simply ignored once the
      | container becomes the inline flex row from `sm` up.
      */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

        <input
          type="month"
          value={payrollMonth}
          onChange={(event) => setPayrollMonth(event.target.value)}
          aria-label="Payroll month"
          /*
          | Not `.ui-field`: the kit's field fills its line, and this control
          | is a toolbar item that shrinks to its own width from `sm` up.
          */
          className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring sm:w-auto sm:px-4"
        />

        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
        >

          <FiRefreshCw className={loading ? "animate-spin" : ""} />

          Refresh

        </button>

        <button
          type="button"
          onClick={onGenerateAll}
          disabled={runDisabled}
          title={runHint}
          className="ui-btn ui-btn-primary col-span-2 w-full font-semibold sm:w-auto"
        >

          <FiPlayCircle className={`shrink-0 ${generatingAll ? "animate-spin" : ""}`} />

          {/*
          | Sharing the line with Refresh leaves about half a phone for this
          | button, which "Generate Payroll" does not fit — the word the month
          | picker above already supplies is the one dropped.
          */}
          {generatingAll ? (
            "Generating..."
          ) : (
            <>
              <span className="sm:hidden">Generate</span>
              <span className="hidden sm:inline">Generate Payroll</span>
            </>
          )}

        </button>

      </div>

    </div>

  );

}

export default PayrollHeader;
