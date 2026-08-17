import { FiPlayCircle, FiRefreshCw } from "react-icons/fi";
import { TbReportMoney } from "react-icons/tb";
import { formatPayrollMonth } from "../../utils/Payroll/payrollDate";

/*
|--------------------------------------------------------------------------
| Payroll Header
|--------------------------------------------------------------------------
| The dashboard toolbar: the month every panel below is read for, a refresh,
| and the run that generates the whole month.
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

  return (

    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
          <TbReportMoney />
        </div>

        <div className="min-w-0">

          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">
            Payroll Dashboard
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
            {totalEmployees > 0
              ? `${totalEmployees - pendingCount} of ${totalEmployees} generated for ${formatPayrollMonth(payrollMonth)}.`
              : "Generate and review the monthly payroll run."}
          </p>

        </div>

      </div>

      {/*
      | On a phone the month takes a line of its own and the two buttons split
      | the one under it — three controls on one line is what pushed the run
      | button off the card at that width.
      */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">

        <input
          type="month"
          value={payrollMonth}
          onChange={(event) => setPayrollMonth(event.target.value)}
          aria-label="Payroll month"
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto"
        />

        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >

          <FiRefreshCw className={loading ? "animate-spin" : ""} />

          Refresh

        </button>

        <button
          type="button"
          onClick={onGenerateAll}
          disabled={runDisabled}
          title={runHint}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md sm:flex-none sm:px-5"
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
