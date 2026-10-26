import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFilter,
} from "react-icons/fi";
import { MONTHS } from "../../../utils/attendance/attendanceConstants";

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
    <div className={`ui-card overflow-hidden ${className}`}>

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
      <div className="border-b border-line">
        {(title || action) && (
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="min-w-0">

              <h2 className="ui-card-title">
                {title}
              </h2>

              {subtitle && (
                <p className="ui-card-subtitle">
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
            className={`flex flex-col gap-3 bg-surface-muted/60 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${
              title || action ? "border-t border-line-subtle" : ""
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
    <span className="ui-badge bg-blue-50 text-blue-700">
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
        <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      )}

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel || placeholder}
        /*
        | Not `.ui-field`: the kit sets its own padding, and this control has
        | to leave room on the left for the filter icon sitting inside it.
        */
        className={`w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface py-2.5 pr-8 text-sm font-medium text-ink outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring ${icon ? "pl-10" : "pl-4"}`}
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
      className="ui-btn ui-btn-primary w-full font-semibold sm:w-auto"
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
| The arrows step one month. Passing `year`, `month` and `onSelect` also turns
| the label into a picker - a year stepper over a grid of the twelve months -
| so a month a year back is two clicks rather than twelve.
|
| Months after the current one are never offered, matching the arrows: no
| attendance exists for them yet. `min` ({ year, month }) bounds the other
| end, for a view that has nothing before a certain month (an employee's
| joining month), and also stops the previous arrow there.
|
| The panel is portalled and fixed against the label, the same way
| `ActionMenu` is: the tables this sits in clip their own overflow.
*/

const PICKER_WIDTH = 256;
const PICKER_HEIGHT = 232;
const PICKER_GAP = 6;

const toMonthIndex = (year, month) => year * 12 + (month - 1);

function MonthPicker({ anchorRef, year, month, min, onSelect, onClose }) {

  const today = new Date();
  const maxIndex = toMonthIndex(today.getFullYear(), today.getMonth() + 1);
  const minIndex = min ? toMonthIndex(min.year, min.month) : -Infinity;

  const [viewYear, setViewYear] = useState(year);
  const [style, setStyle] = useState(null);

  const panelRef = useRef(null);

  useLayoutEffect(() => {

    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.min(
      Math.max(PICKER_GAP, rect.left + rect.width / 2 - PICKER_WIDTH / 2),
      window.innerWidth - PICKER_WIDTH - PICKER_GAP
    );

    const openUp =
      window.innerHeight - rect.bottom < PICKER_HEIGHT && rect.top > PICKER_HEIGHT;

    setStyle({
      position: "fixed",
      left,
      width: PICKER_WIDTH,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + PICKER_GAP }
        : { top: rect.bottom + PICKER_GAP }),
    });

  }, [anchorRef]);

  useEffect(() => {

    const handlePointerDown = (event) => {
      if (anchorRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      onClose();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    // The label moves with the page behind it, so the panel is dismissed.
    const handleScroll = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", onClose);
    };

  }, [anchorRef, onClose]);

  if (!style) return null;

  const canPrevYear = toMonthIndex(viewYear - 1, 12) >= minIndex;
  const canNextYear = toMonthIndex(viewYear + 1, 1) <= maxIndex;

  const yearButtonClass =
    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Choose month"
      style={style}
      className="z-50 rounded-xl border border-line bg-surface p-3 shadow-lg shadow-slate-900/10"
    >

      <div className="mb-2 flex items-center justify-between">

        <button
          type="button"
          onClick={() => setViewYear((value) => value - 1)}
          disabled={!canPrevYear}
          aria-label="Previous year"
          className={yearButtonClass}
        >
          <FiChevronLeft size={16} />
        </button>

        <span className="text-sm font-semibold text-ink">{viewYear}</span>

        <button
          type="button"
          onClick={() => setViewYear((value) => value + 1)}
          disabled={!canNextYear}
          aria-label="Next year"
          className={yearButtonClass}
        >
          <FiChevronRight size={16} />
        </button>

      </div>

      <div className="grid grid-cols-3 gap-1.5">

        {MONTHS.map((name, index) => {

          const monthNumber = index + 1;
          const monthIndex = toMonthIndex(viewYear, monthNumber);
          const disabled = monthIndex > maxIndex || monthIndex < minIndex;
          const selected = viewYear === year && monthNumber === month;
          const current = monthIndex === maxIndex;

          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${name} ${viewYear}`}
              onClick={() => {
                onSelect(viewYear, monthNumber);
                onClose();
              }}
              className={`h-9 cursor-pointer rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                selected
                  ? "bg-brand text-white"
                  : `hover:bg-surface-muted disabled:hover:bg-transparent ${
                      current
                        ? "text-brand ring-1 ring-inset ring-brand"
                        : "text-ink-muted hover:text-ink"
                    }`
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );

        })}

      </div>

    </div>,
    document.body
  );

}

export function MonthNavigator({
  label,
  onChange,
  disableNext = false,
  year,
  month,
  onSelect,
  min,
}) {

  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const labelRef = useRef(null);

  const canPick = Boolean(year && month && onSelect);

  const disablePrev = Boolean(
    min && year && month &&
    toMonthIndex(year, month) <= toMonthIndex(min.year, min.month)
  );

  return (
    /*
    | Fills its line on a phone with the two arrows pushed to the edges, which
    | is where a thumb reaches for them. From `sm` it shrinks back to the
    | inline control that sits beside the other toolbar filters.
    */
    <div className="flex w-full items-center justify-between gap-1 rounded-xl border border-line bg-surface p-1 sm:w-auto sm:justify-start">

      <button
        type="button"
        onClick={() => onChange("prev")}
        disabled={disablePrev}
        aria-label="Previous month"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiChevronLeft size={18} />
      </button>

      {canPick ? (
        <button
          ref={labelRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-9 min-w-32 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          {label}
          <FiChevronDown
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      ) : (
        <span className="min-w-32 text-center text-sm font-semibold text-ink-muted">
          {label}
        </span>
      )}

      {open && canPick && (
        <MonthPicker
          anchorRef={labelRef}
          year={year}
          month={month}
          min={min}
          onSelect={onSelect}
          onClose={close}
        />
      )}

      <button
        type="button"
        onClick={() => onChange("next")}
        disabled={disableNext}
        aria-label="Next month"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiChevronRight size={18} />
      </button>

    </div>
  );
}
