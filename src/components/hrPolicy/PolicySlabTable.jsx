import { FiPlus, FiTrash2 } from "react-icons/fi";
import {
  toNumber,
  toNumericInput,
} from "../../utils/hrPolicy/hrPolicyConstants";

/*
|--------------------------------------------------------------------------
| Policy Slab Table
|--------------------------------------------------------------------------
| The editor both slab based policies are drawn in: Professional Tax, where
| each band charges a flat monthly amount, and Income Tax, where each band
| charges a percentage.
|
| The only difference between the two is the second column, so it is passed in
| - `valueKey` is which key the row holds it under, `valueUnit` whether it is
| rupees or a percentage. Everything else about a slab table is the same in
| both, and writing it twice would let the two drift apart.
|
| A row is a ceiling and a value. The band it covers is not typed in: it starts
| where the row above ended, so "From" is shown rather than entered and there
| is no way to leave a gap between two bands or to overlap them.
|
| The last row has no ceiling. It is what catches every salary above the row
| before it, so it cannot be removed and its limit box reads "No limit" instead
| of being editable - a table whose top band could be closed off would silently
| stop deducting from whoever earned past it.
|--------------------------------------------------------------------------
*/

const currency = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function PolicySlabTable({
  slabs = [],
  valueKey = "amount",
  valueLabel = "Amount",
  valueUnit = "₹",
  rangeLabel = "Monthly gross",
  disabled = false,
  errors = {},
  onChangeRow,
  onAddRow,
  onRemoveRow,
}) {

  const isPercent = valueUnit === "%";

  /*
  | Where a band starts: the ceiling of the row above it. A row whose
  | predecessor has not been filled in yet has nothing to show, so it says so
  | rather than printing "₹NaN".
  */
  const bandStart = (index) => {

    if (index === 0) return "₹0";

    const previous = toNumber(slabs[index - 1]?.upTo);

    return Number.isFinite(previous) ? `₹${currency.format(previous)}` : "—";

  };

  /*
  | `padding` is which side the unit sign hangs off, and it is passed in rather
  | than read from `isPercent`: the ceiling box is always in rupees, even on the
  | income tax table where the second column is a percentage.
  */
  const inputClass = (hasError, padding) =>
    `w-full rounded-xl border bg-white py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:ring-2 ${padding} ${
      hasError
        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
        : "border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100"
    } ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : ""}`;

  return (
    <div className="space-y-3">

      {/* Column captions, on the widths where the rows actually line up */}
      <div className="hidden gap-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">

        <span>{rangeLabel} from</span>

        <span>Up to</span>

        <span>{valueLabel}</span>

        {/* Sits over the remove buttons, which need no caption of their own */}
        <span className="w-9" aria-hidden="true" />

      </div>

      {slabs.map((row, index) => {

        const isLast = index === slabs.length - 1;

        const ceilingError = errors[`${index}.upTo`] || "";

        const valueError = errors[`${index}.${valueKey}`] || "";

        return (
          <div
            key={row.id ?? index}
            className="rounded-xl border border-slate-200 p-3 sm:rounded-none sm:border-0 sm:p-0"
          >

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">

              {/* From - derived from the row above, never typed */}
              <div>

                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                  {rangeLabel} from
                </span>

                <div className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-medium text-slate-600">
                  {bandStart(index)}
                </div>

              </div>

              {/* Up to */}
              <div>

                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                  Up to
                </span>

                {isLast ? (

                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-medium text-slate-500">
                    No limit
                  </div>

                ) : (

                  <div className="relative">

                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      ₹
                    </span>

                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-label={`Slab ${index + 1} upper limit`}
                      value={row.upTo ?? ""}
                      placeholder="0"
                      disabled={disabled}
                      onChange={(event) =>
                        onChangeRow?.(
                          index,
                          "upTo",
                          toNumericInput(event.target.value)
                        )
                      }
                      className={inputClass(ceilingError, "pl-7 pr-3")}
                    />

                  </div>

                )}

              </div>

              {/* The amount or the rate this band charges */}
              <div>

                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                  {valueLabel}
                </span>

                <div className="relative">

                  {!isPercent && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      ₹
                    </span>
                  )}

                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-label={`Slab ${index + 1} ${valueLabel}`}
                    value={row[valueKey] ?? ""}
                    placeholder="0"
                    disabled={disabled}
                    onChange={(event) =>
                      onChangeRow?.(
                        index,
                        valueKey,
                        toNumericInput(event.target.value)
                      )
                    }
                    className={inputClass(
                      valueError,
                      isPercent ? "pl-3 pr-8" : "pl-7 pr-3"
                    )}
                  />

                  {isPercent && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      %
                    </span>
                  )}

                </div>

              </div>

              {/*
              | The top band is the table's catch all, so it has no remove
              | button. The space is still held, so the rows above it do not
              | shift across once it is the only one left.
              */}
              <div className="flex justify-end sm:block">

                {isLast ? (

                  <span className="hidden h-9 w-9 sm:block" aria-hidden="true" />

                ) : (

                  <button
                    type="button"
                    onClick={() => onRemoveRow?.(index)}
                    disabled={disabled}
                    aria-label={`Remove slab ${index + 1}`}
                    className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-400"
                  >
                    <FiTrash2 size={16} />
                  </button>

                )}

              </div>

            </div>

            {(ceilingError || valueError) && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {ceilingError || valueError}
              </p>
            )}

          </div>
        );

      })}

      {errors.slabs && (
        <p className="text-xs font-medium text-red-600">
          {errors.slabs}
        </p>
      )}

      {/*
      | A new row is added above the open ended one rather than after it: it is
      | a band being inserted under the top one, not a new catch all.
      */}
      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-600"
      >

        <FiPlus size={16} />

        Add slab

      </button>

    </div>
  );

}

export default PolicySlabTable;
