import { FiDownload, FiFileText } from "react-icons/fi";
import { formatCurrency } from "../../../utils/salary/formatCurrency";
import { formatPayrollDate } from "../../../utils/Payroll/payrollDate";
import { formatFinancialYear } from "../../../utils/Payroll/financialYear";
import PayrollStatusBadge from "../common/PayrollStatusBadge";

/*
|--------------------------------------------------------------------------
| My Payroll Month Card
|--------------------------------------------------------------------------
| The employee's latest month in the selected year: what they earned, what
| came off it, what reached their account and when.
|
| It is the newest payslip of the year rather than the current calendar month.
| Payroll for a month is run at the end of it, so on the fifth of September
| the thing somebody opens this page to see is August - and a card that said
| "September" and stood empty would read as a month that had been missed. The
| card names the month it is actually showing, so it is never ambiguous which
| one that is.
|
| The four figures are read left to right in the order they happen: gross,
| less deductions, is the net, paid on the date. Net is the one drawn larger
| and in the accent, because it is the number the page is opened for and the
| other three are how it was arrived at.
|
| The download sits alone in a footer at the bottom right, away from the
| figures. A payslip is not released until its month is locked, so the button
| goes grey more often than it does not - and it always says which reason it
| is rather than going grey without a word.
|--------------------------------------------------------------------------
*/

/*
| One figure. `tone` carries the emphasis rather than a boolean flag, so the
| net can be drawn in the accent without every other cell learning about it.
*/

const Figure = ({ label, value, tone = "text-ink" }) => (

  <div className="min-w-0">

    <p className="ui-eyebrow">
      {label}
    </p>

    <p className={`mt-1.5 truncate text-lg font-bold sm:text-xl ${tone}`} title={value}>
      {value}
    </p>

  </div>

);

function MyPayrollMonthCard({
  row = null,
  financialYear,
  loading = false,
  onDownload,
}) {

  if (loading) {
    return <div className="ui-card h-56 animate-pulse" />;
  }

  /*
  | A year with no payroll in it at all. Said inside the card rather than by
  | hiding it, so the shape of the page is the same whichever year is picked
  | and the reader is told why it is empty instead of being left to wonder.
  */
  if (!row) {

    return (

      <div className="ui-card ui-card-body">

        <div className="flex flex-col items-center justify-center px-4 py-10 text-center sm:py-14">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted text-ink-subtle">
            <FiFileText size={28} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-ink sm:text-xl">
            No payslip yet
          </h3>

          <p className="mt-2 max-w-sm text-sm text-ink-subtle">
            No payroll has been generated for you in{" "}
            {formatFinancialYear(financialYear)}. Your payslips appear here as
            each month is run.
          </p>

        </div>

      </div>

    );

  }

  const released = row.release?.allowed;

  return (

    <div className="ui-card overflow-hidden">

      <div className="ui-card-body">

        <div className="flex flex-wrap items-start justify-between gap-3">

          <div className="min-w-0">

            <h2 className="ui-card-title">
              {row.monthLabel}
            </h2>

            <p className="ui-card-subtitle">
              Your latest salary payment
            </p>

          </div>

          <PayrollStatusBadge status={row.status} />

        </div>

        {/*
        | Two across on a phone and four across from `sm`. Currency at this
        | weight does not fit four to a phone without truncating every one of
        | them, and a truncated amount is worse than a second line.
        */}
        <div className="mt-6 grid grid-cols-2 gap-5 border-t border-line-subtle pt-5 sm:grid-cols-4 sm:gap-6">

          <Figure
            label="Gross Salary"
            value={formatCurrency(row.gross)}
          />

          <Figure
            label="Total Deductions"
            value={formatCurrency(row.deductions)}
            tone="text-rose-600"
          />

          <Figure
            label="Net Salary"
            value={formatCurrency(row.netPay)}
            tone="text-emerald-600"
          />

          <Figure
            label="Pay Date"
            value={formatPayrollDate(row.payDate)}
            tone="text-ink-muted"
          />

        </div>

      </div>

      {/*
      | The footer the action lives in. Tinted and ruled off so the button
      | reads as the card's action rather than as a fifth figure, and pushed to
      | the right edge from `sm` up - on a phone it fills the line instead,
      | because half a phone is not a comfortable target.
      */}
      <div className="flex justify-end border-t border-line bg-surface-muted/60 px-4 py-4 sm:px-6">

        <button
          type="button"
          onClick={() => onDownload(row.payrollMonth)}
          disabled={!released}
          title={
            released
              ? `Download the payslip for ${row.monthLabel}`
              : row.release?.reason
          }
          className="ui-btn ui-btn-primary w-full font-semibold sm:w-auto"
        >

          <FiDownload className="shrink-0" />

          Download Payslip

        </button>

      </div>

      {/*
      | Why the button is grey, said out loud as well as on its tooltip. A
      | tooltip never reaches a touch screen, and this is the one thing an
      | employee is most likely to arrive wanting.
      */}
      {!released && row.release?.reason && (

        <p className="border-t border-line-subtle bg-amber-50 px-4 py-3 text-xs text-amber-700 sm:px-6">
          {row.release.reason}
        </p>

      )}

    </div>

  );

}

export default MyPayrollMonthCard;
