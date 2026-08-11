import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFilter,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Panel & Toolbar Primitives
|--------------------------------------------------------------------------
| The card shell and the toolbar controls every attendance table repeats.
| Defining them once keeps spacing, borders and focus styles identical.
|--------------------------------------------------------------------------
*/

export function AttendancePanel({
  title,
  subtitle,
  action,
  toolbar,
  className = "",
  children,
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >

      {/*
      | Heading and toolbar are stacked, not sat side by side.
      |
      | A search box, two filters and an export button asked to share one line
      | need more width than the card has: the row overflowed and the panel
      | clipped it, which is what cut "All Status" down to "All S" and slid the
      | export button over the subtitle.
      |
      | Given a row each, both lay out the way they were written to - heading
      | left and its action right, search left and its filters right.
      */}
      <div className="border-b border-slate-200">
        {(title || action) && (
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="min-w-0">

              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                {title}
              </h2>

              {subtitle && (
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {subtitle}
                </p>
              )}

            </div>

            {/*
            | Never squeezed by a long title — the heading wraps instead.
            |
            | Full width until the row splits in two at `lg`, so a button that
            | asks to fill its line on a phone actually can.
            */}
            {action && (
              <div className="flex w-full shrink-0 flex-wrap items-center gap-3 lg:w-auto">
                {action}
              </div>
            )}

          </div>
        )}

        {toolbar && (
          /* Divider only under a heading — on its own it would sit at the very
             top edge of the card as a stray line. */
          <div
            className={`flex flex-col gap-3 bg-slate-50/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${
              title || action ? "border-t border-slate-100" : ""
            }`}
          >
            {toolbar}
          </div>
        )}
      </div>

      {children}

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Live Badge
|--------------------------------------------------------------------------
*/

export function LiveBadge({ label = "Live" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
      {label}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| Filter Select
|--------------------------------------------------------------------------
*/

export function FilterSelect({
  value,
  onChange,
  options = [],
  placeholder = "All",
  ariaLabel,
  icon = true,
}) {
  return (
    <div className="relative">

      {icon && (
        <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      )}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel || placeholder}
        className={`w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pr-8 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${icon ? "pl-10" : "pl-4"}`}
      >

        <option value="">{placeholder}</option>

        {options.map((option) => {

          const optionValue =
            typeof option === "string" ? option : option.value;

          const optionLabel =
            typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );

        })}

      </select>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Export Button
|--------------------------------------------------------------------------
*/

export function ExportButton({ onClick, disabled = false, label = "Export" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:w-auto"
    >
      <FiDownload />
      {label}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Month Navigator
|--------------------------------------------------------------------------
*/

export function MonthNavigator({ label, onChange, disableNext = false }) {
  return (
    /*
    | Fills its line on a phone with the two arrows pushed to the edges, which
    | is where a thumb reaches for them. From `sm` it shrinks back to the
    | inline control that sits beside the other toolbar filters.
    */
    <div className="flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-auto sm:justify-start">

      <button
        type="button"
        onClick={() => onChange("prev")}
        aria-label="Previous month"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600"
      >
        <FiChevronLeft size={18} />
      </button>

      <span className="min-w-32 text-center text-sm font-semibold text-slate-700">
        {label}
      </span>

      <button
        type="button"
        onClick={() => onChange("next")}
        disabled={disableNext}
        aria-label="Next month"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiChevronRight size={18} />
      </button>

    </div>
  );
}
