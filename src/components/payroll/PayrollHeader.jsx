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

    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
          <TbReportMoney />
        </div>

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payroll Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {totalEmployees > 0
              ? `${totalEmployees - pendingCount} of ${totalEmployees} generated for ${formatPayrollMonth(payrollMonth)}.`
              : "Generate and review the monthly payroll run."}
          </p>

        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">

        <input
          type="month"
          value={payrollMonth}
          onChange={(event) => setPayrollMonth(event.target.value)}
          aria-label="Payroll month"
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >

          <FiRefreshCw className={loading ? "animate-spin" : ""} />

          Refresh

        </button>

        <button
          type="button"
          onClick={onGenerateAll}
          disabled={runDisabled}
          title={runHint}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
        >

          <FiPlayCircle className={generatingAll ? "animate-spin" : ""} />

          {generatingAll ? "Generating..." : "Generate Payroll"}

        </button>

      </div>

    </div>

  );

}

export default PayrollHeader;
