import { FiDownload } from "react-icons/fi";
import { formatCurrency } from "../../../utils/salary/formatCurrency";
import { formatPayrollDate } from "../../../utils/Payroll/payrollDate";
import PayrollStatusBadge from "../common/PayrollStatusBadge";

/*
|--------------------------------------------------------------------------
| My Payroll History Card
|--------------------------------------------------------------------------
| One month of the history, for the widths where the table has no room for six
| columns - the same rows `MyPayrollHistory` renders from `md` up.
|
| The month and its status share the top line, the three amounts sit under it
| as a label above a figure each, and the download takes a full width line at
| the bottom. It is not folded into a three dot menu the way the payroll
| dashboard's card is: there is only ever one action here, and a menu that
| opens onto a single item is a tap spent on nothing.
|
| The padding, the divider between rows and the press state belong to
| `DataTable`, which is what renders this - the same as every other
| `mobileCard` in the product.
|--------------------------------------------------------------------------
*/

const Amount = ({ label, value, tone = "text-ink" }) => (

  <div className="min-w-0">

    <p className="ui-eyebrow">
      {label}
    </p>

    <p className={`mt-1 truncate text-sm font-bold ${tone}`}>
      {value}
    </p>

  </div>

);

function MyPayrollHistoryCard({ row, onDownload }) {

  const released = row.release?.allowed;

  return (

    <div>

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="truncate text-sm font-semibold text-ink sm:text-base">
            {row.monthLabel}
          </p>

          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            Paid {formatPayrollDate(row.payDate)}
          </p>

        </div>

        <PayrollStatusBadge status={row.status} size="sm" />

      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line-subtle pt-3">

        <Amount label="Gross" value={formatCurrency(row.gross)} />

        <Amount
          label="Deduct"
          value={formatCurrency(row.deductions)}
          tone="text-rose-600"
        />

        <Amount
          label="Net Pay"
          value={formatCurrency(row.netPay)}
          tone="text-emerald-600"
        />

      </div>

      {/*
      | Kept in place when it is disabled rather than removed, so every row is
      | the same height and the reason is on the line underneath - a tooltip
      | never reaches the screen this card is drawn for.
      */}
      <button
        type="button"
        onClick={() => onDownload(row.payrollMonth)}
        disabled={!released}
        className="ui-btn ui-btn-secondary mt-3 w-full font-semibold"
      >

        <FiDownload size={14} className="shrink-0" />

        Download Payslip

      </button>

      {!released && row.release?.reason && (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-700">
          {row.release.reason}
        </p>
      )}

    </div>

  );

}

export default MyPayrollHistoryCard;
