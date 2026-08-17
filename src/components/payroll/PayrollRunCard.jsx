import { FiCheckCircle, FiLock, FiPlayCircle } from "react-icons/fi";
import {
  PAYROLL_PENDING,
  PAYROLL_RUN_STATUS,
} from "../../utils/Payroll/payrollConstants";
import { getRunStatus } from "../../utils/Payroll/payrollRun";
import { formatPayrollMonth } from "../../utils/Payroll/payrollDate";
import { formatCurrency } from "../../utils/salary/formatCurrency";
import PayrollStatusBadge from "./common/PayrollStatusBadge";

/*
|--------------------------------------------------------------------------
| Payroll Run Card
|--------------------------------------------------------------------------
| The month itself: what state it is in, what it came to, who took it through
| each step, and the two buttons that move it on.
|
| Approve and lock live here rather than in the header beside Generate,
| because they are not the same kind of action. Generate is something done to
| the employees in a month and can be repeated; these two are done to the
| month and cannot be taken back. Putting them next to the stamps they leave
| behind is what makes that readable.
|
| The card is deliberately shown for a month that has never been run. An
| empty state that says "not generated yet" is the answer to the question
| somebody opened the page to ask, and hiding the card would leave them
| looking at a table for the reason.
|--------------------------------------------------------------------------
*/

/*
| The three steps as a strip, each either done and dated or still ahead. A
| step is a stamp: the moment it happened and who did it, which together are
| what makes a closed month auditable.
*/

const formatStamp = (at, by) => {
  if (!at) return "";

  const when = new Date(at).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return by?.name ? `${when} · ${by.name}` : when;
};

/*
| A stamp is a date, a time and a name on one line, so it takes the full width
| of the phone grid — half of it truncates the name away, which is the half
| that makes the month auditable.
*/
const Step = ({ label, at, by, pending }) => (
  <div className="col-span-2 min-w-0 sm:col-span-1">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
      {label}
    </p>

    <p
      className={`mt-1 truncate text-sm ${
        at ? "font-medium text-slate-700" : "text-slate-400"
      }`}
      title={formatStamp(at, by)}
    >
      {at ? formatStamp(at, by) : pending}
    </p>
  </div>
);

const Total = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
      {label}
    </p>

    <p className="mt-1 truncate text-base font-bold text-slate-900 sm:text-lg">
      {value}
    </p>
  </div>
);

/*
| One button per step. Both are disabled far more often than they are not - a
| month is only approvable in one state and only lockable in one - so the
| reason is always on the title, never left to the grey.
*/

const ActionButton = ({ gate, busy, busyLabel, label, icon, tone, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!gate.allowed || busy}
    title={gate.reason || label}
    className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md sm:flex-none sm:px-5 ${tone}`}
  >
    {icon}
    {busy ? busyLabel : label}
  </button>
);

function PayrollRunCard({
  run = null,
  payrollMonth,
  loading = false,
  busy = "",
  approveGate,
  lockGate,
  onApprove,
  onLock,
}) {

  if (loading) {
    return (
      <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    );
  }

  const status = getRunStatus(run);

  const isPending = status === PAYROLL_PENDING;

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

      <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">

            <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {formatPayrollMonth(payrollMonth)} Run
            </h2>

            <PayrollStatusBadge status={status} />

          </div>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {isPending
              ? "This month has not been generated yet."
              : status === PAYROLL_RUN_STATUS.LOCKED
                ? "This month is final. Nothing in it can be changed."
                : status === PAYROLL_RUN_STATUS.APPROVED
                  ? "Signed off and closed to changes. Lock it to make it final."
                  : `${run?.totalEmployees ?? 0} employee${run?.totalEmployees === 1 ? "" : "s"} in this run, still open to changes.`}
          </p>

        </div>

        {/* Two buttons, half a phone each, rather than one wrapping under. */}
        <div className="flex items-center gap-2 sm:gap-3">

          <ActionButton
            gate={approveGate}
            busy={busy === "approve"}
            busyLabel="Approving..."
            label="Approve"
            icon={<FiCheckCircle />}
            tone="bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 focus:ring-indigo-400"
            onClick={onApprove}
          />

          <ActionButton
            gate={lockGate}
            busy={busy === "lock"}
            busyLabel="Locking..."
            label="Lock"
            icon={<FiLock />}
            tone="bg-slate-800 shadow-slate-800/20 hover:bg-slate-900 hover:shadow-slate-800/30 focus:ring-slate-500"
            onClick={onLock}
          />

        </div>

      </div>

      {/*
      | The stored totals, not a sum of the table underneath. They are what
      | the month was closed on, so they keep saying so even if a record is
      | corrected afterwards.
      */}
      {!isPending && (

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:mt-6 sm:grid-cols-3 sm:gap-5 sm:pt-5 lg:grid-cols-6">

          <Total label="Employees" value={run?.totalEmployees ?? 0} />

          <Total label="Total Gross" value={formatCurrency(run?.totalGross)} />

          <Total
            label="Total Deductions"
            value={formatCurrency(run?.totalDeductions)}
          />

          <Total label="Total Net" value={formatCurrency(run?.totalNet)} />

          <Step
            label="Generated"
            at={run?.generatedAt}
            by={run?.generatedBy}
            pending="--"
          />

          <Step
            label={status === PAYROLL_RUN_STATUS.LOCKED ? "Locked" : "Approved"}
            at={
              status === PAYROLL_RUN_STATUS.LOCKED
                ? run?.lockedAt
                : run?.approvedAt
            }
            by={
              status === PAYROLL_RUN_STATUS.LOCKED
                ? run?.lockedBy
                : run?.approvedBy
            }
            pending="Not yet"
          />

        </div>

      )}

      {isPending && (

        <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:mt-6 sm:pt-5 sm:text-sm">

          <FiPlayCircle className="shrink-0 text-slate-400" />

          <span>
            Generate the month to open it for approval.
          </span>

        </div>

      )}

    </div>

  );

}

export default PayrollRunCard;
