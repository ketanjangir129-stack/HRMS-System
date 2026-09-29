import {
  AlertTriangle,
  Calculator,
  Info,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  FNF_DEDUCTION_FIELDS,
  FNF_EARNING_FIELDS,
} from "../../utils/resignation/resignationConstants";

import { calculateFnF } from "../../utils/resignation/fnfCalculator";

import { formatCurrency } from "../../utils/salary/formatCurrency";

import { formatDate, getOutstandingEquipment } from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Full & Final Worksheet
|--------------------------------------------------------------------------
| What the company owes and what it takes back, as a form HR fills in and as
| a statement everybody afterwards reads.
|
| The totals are computed from what is on screen on every keystroke rather
| than from anything stored. A settlement whose total disagrees with the
| lines above it is the single worst thing this screen could do, and
| recomputing from the inputs is what makes that impossible.
|
| Two things are shown beside the fields rather than typed into them:
|
|   the salary derivation — how the payable figure was reached, so the number
|   in the box is checkable instead of being taken on trust
|
|   the notice shortfall and any unreturned equipment — the two facts a
|   Notice Recovery and an Asset Recovery are usually priced from
|
| Neither is filled in automatically. What a day of shortfall or a missing
| laptop is worth is a policy question this module has no policy to read, so
| it reports the facts and leaves the figure to the person who knows.
|--------------------------------------------------------------------------
*/

/* One editable money row. */
function AmountField({ field, value, error, disabled, onChange }) {

  return (
    <div>

      <label className="ui-label" htmlFor={`fnf-${field.name}`}>
        {field.label}
      </label>

      <div className="relative">

        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-faint">
          ₹
        </span>

        <input
          id={`fnf-${field.name}`}
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder="0"
          className={`ui-field ui-field-currency ${
            error ? "border-red-400" : ""
          }`}
        />

      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : (
        field.hint && (
          <p className="mt-1.5 text-xs text-ink-faint">{field.hint}</p>
        )
      )}

    </div>
  );

}

function FnFWorksheet({
  resignation,
  values = {},
  errors = {},
  notes = "",
  derivation = null,
  noticeShortfall = null,
  readOnly = false,
  onChange,
  onNotesChange,
}) {

  const totals = calculateFnF(values);

  const outstanding = getOutstandingEquipment(resignation?.equipment);

  const handleChange = (name, raw) => {

    if (readOnly || !onChange) return;

    /*
    | Kept as the raw string rather than coerced to a number here. Coercing on
    | every keystroke turns a half-typed "1200." into 1200 and puts the cursor
    | back at the end of a value the user was still editing. The calculator
    | reads it as a number, and `validateFnF` is what refuses anything that is
    | not one.
    */
    onChange({ ...values, [name]: raw });

  };

  return (

    <div className="space-y-5">

      {/* What the figures are being calculated against */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-line bg-surface-muted p-4">

          <p className="ui-eyebrow">Last Working Day</p>

          <p className="mt-1.5 text-lg font-bold text-ink">
            {formatDate(resignation?.lastWorkingDay)}
          </p>

        </div>

        <div className="rounded-2xl border border-line bg-surface-muted p-4">

          <p className="ui-eyebrow">Notice Served</p>

          <p className="mt-1.5 text-lg font-bold text-ink">
            {noticeShortfall?.served || 0} / {noticeShortfall?.required || 0} days
          </p>

          {noticeShortfall?.shortfallDays > 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              {noticeShortfall.shortfallDays} day
              {noticeShortfall.shortfallDays === 1 ? "" : "s"} short
            </p>
          )}

        </div>

        <div className="rounded-2xl border border-line bg-surface-muted p-4">

          <p className="ui-eyebrow">Equipment Outstanding</p>

          <p className="mt-1.5 text-lg font-bold text-ink">
            {outstanding.length}
          </p>

          {outstanding.length > 0 && (
            <p className="mt-1 truncate text-xs font-semibold text-amber-700">
              {outstanding.map((item) => item.label).join(", ")}
            </p>
          )}

        </div>

      </div>

      {/*
      | How the payable figure was reached. Shown only when the app could
      | actually derive one - an employee with no salary structure on record
      | gets the note below instead, which says why the box came up empty
      | rather than leaving HR to guess.
      */}
      {derivation?.monthlyGross > 0 ? (

        <p className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">

          <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0" />

          <span>
            Salary payable is derived as{" "}
            <strong>{formatCurrency(derivation.monthlyGross)}</strong> ÷{" "}
            {derivation.daysInMonth} days ×{" "}
            {derivation.paidDays} worked ={" "}
            <strong>{formatCurrency(derivation.amount)}</strong>. Adjust it if
            arrears or corrections apply.
          </span>

        </p>

      ) : (

        <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">

          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />

          <span>
            No salary structure is on record for this employee, so the payable
            salary could not be worked out automatically. Please enter it.
          </span>

        </p>

      )}

      {/* Earnings and deductions, side by side from lg */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Earnings */}
        <section className="ui-card overflow-hidden">

          <div className="flex items-center gap-3 border-b border-line px-5 py-4">

            <span className="ui-tile-sm flex bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>

            <div>
              <h3 className="text-sm font-bold text-ink">Earnings</h3>
              <p className="text-xs text-ink-subtle">Payable to the employee</p>
            </div>

          </div>

          <div className="space-y-4 p-5">

            {FNF_EARNING_FIELDS.map((field) => (
              <AmountField
                key={field.name}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                disabled={readOnly}
                onChange={handleChange}
              />
            ))}

          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-emerald-50/50 px-5 py-4">

            <span className="text-sm font-semibold text-ink-muted">
              Total Earnings
            </span>

            <span className="text-lg font-bold text-emerald-700">
              {formatCurrency(totals.totalEarnings)}
            </span>

          </div>

        </section>

        {/* Deductions */}
        <section className="ui-card overflow-hidden">

          <div className="flex items-center gap-3 border-b border-line px-5 py-4">

            <span className="ui-tile-sm flex bg-red-50 text-red-600">
              <TrendingDown className="h-4 w-4" />
            </span>

            <div>
              <h3 className="text-sm font-bold text-ink">Deductions</h3>
              <p className="text-xs text-ink-subtle">Recovered by the company</p>
            </div>

          </div>

          <div className="space-y-4 p-5">

            {FNF_DEDUCTION_FIELDS.map((field) => (
              <AmountField
                key={field.name}
                field={field}
                value={values[field.name]}
                error={errors[field.name]}
                disabled={readOnly}
                onChange={handleChange}
              />
            ))}

          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line bg-red-50/50 px-5 py-4">

            <span className="text-sm font-semibold text-ink-muted">
              Total Deductions
            </span>

            <span className="text-lg font-bold text-red-700">
              {formatCurrency(totals.totalDeductions)}
            </span>

          </div>

        </section>

      </div>

      {/*
      | The net. A settlement where the recoveries exceed what is owed is a
      | real outcome and is shown as one rather than being clamped to zero -
      | see the note in `calculateFnF`. The wording changes with the sign so
      | nobody reads a recovery as a payment.
      */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
          totals.isRecoverable
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >

        <div className="flex items-center gap-3">

          <span
            className={`ui-tile flex ${
              totals.isRecoverable
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            <Wallet className="h-5 w-5" />
          </span>

          <div>

            <p className="ui-eyebrow">
              {totals.isRecoverable
                ? "Recoverable from Employee"
                : "Net Amount Payable"}
            </p>

            <p
              className={`mt-1 text-2xl font-bold ${
                totals.isRecoverable ? "text-amber-800" : "text-emerald-800"
              }`}
            >
              {formatCurrency(Math.abs(totals.netPayable))}
            </p>

          </div>

        </div>

        <p
          className={`text-xs sm:max-w-xs sm:text-right ${
            totals.isRecoverable ? "text-amber-700" : "text-emerald-700"
          }`}
        >
          {formatCurrency(totals.totalEarnings)} earnings less{" "}
          {formatCurrency(totals.totalDeductions)} deductions
        </p>

      </div>

      {/* Settlement notes */}
      <div>

        <label className="ui-label" htmlFor="fnf-notes">
          Settlement Notes{" "}
          <span className="font-normal text-ink-faint">(optional)</span>
        </label>

        <textarea
          id="fnf-notes"
          rows={3}
          value={notes}
          disabled={readOnly}
          onChange={(e) => onNotesChange?.(e.target.value)}
          placeholder="Anything the reviewer and finance should know about these figures..."
          className="ui-field resize-none"
        />

        {!readOnly && (
          <p className="mt-1.5 flex items-start gap-2 text-xs text-ink-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            These notes travel with the settlement through review and finance
            approval.
          </p>
        )}

      </div>

    </div>

  );

}

export default FnFWorksheet;
