import { FiCalendar, FiPlus, FiRefreshCw } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Holiday Header
|--------------------------------------------------------------------------
| The dashboard toolbar: the year every panel below is read for, a refresh,
| and the add action.
|
| Written in the same anatomy the main Dashboard uses: a small brand coloured
| eyebrow carrying the date, the page name at heading size under it, then the
| one line that says what the page is for.
|
| No card and no filled icon tile. The Dashboard sets its heading directly on
| the page canvas, and a white strip around this one made the first thing on
| the page read as a panel of its own rather than as the page's title.
|
| Holidays are stored per year, so the selector drives the whole page rather
| than only the table. The range runs one year back and one forward, which is
| the same window the leave header offers: next year's calendar is usually
| published before the year starts.
|
| The add action is only rendered for a role that holds `holidays.add`, so a
| calendar that is published to everyone is still only written by the people
| who are meant to publish it.
|--------------------------------------------------------------------------
*/

function HolidayHeader({
  year,
  setYear,
  onAddHoliday,
  onRefresh,
  loading = false,
  totalHolidays = 0,
  canAddHoliday = true,
}) {

  const currentYear = new Date().getFullYear();

  const years = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  /*
  | A holiday saved for a year outside the window still has to be reachable,
  | so the stored year is added to the list rather than silently dropped.
  */

  if (!years.includes(Number(year))) {
    years.push(Number(year));
    years.sort((a, b) => a - b);
  }

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

        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Holiday Management
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">
          {totalHolidays > 0
            ? `${totalHolidays} holiday${totalHolidays === 1 ? "" : "s"} declared for ${year}.`
            : "Declare and manage the company holiday calendar."}
        </p>

      </div>

      {/*
      | On a phone the controls are a two column grid rather than a wrapped
      | row: the year and the refresh share a line, and the add action takes a
      | line of its own, so "Add Holiday" is a full width target instead of
      | whatever width happens to be left over at the end of a wrap.
      |
      | `col-span-2` is a grid property, so it is simply ignored once the
      | container becomes the inline flex row from `sm` up.
      */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

        <select
          value={year}
          onChange={(event) =>
            setYear(Number(event.target.value))
          }
          aria-label="Holiday year"
          /*
          | Not `.ui-field`: the kit's field fills its line, and this control
          | is a toolbar item that shrinks to its own width from `sm` up.
          */
          className="w-full cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink-muted outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-ring sm:w-auto sm:px-4"
        >

          {years.map((item) => (

            <option key={item} value={item}>
              {item}
            </option>

          ))}

        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ui-btn ui-btn-secondary w-full font-semibold sm:w-auto"
        >

          <FiRefreshCw
            className={loading ? "animate-spin" : ""}
          />

          Refresh

        </button>

        {canAddHoliday && (

          <button
            type="button"
            onClick={onAddHoliday}
            className="ui-btn ui-btn-primary group col-span-2 w-full font-semibold sm:w-auto"
          >

            <FiPlus
              size={18}
              className="transition-transform duration-200 group-hover:rotate-90"
            />

            Add Holiday

          </button>

        )}

      </div>

    </div>

  );

}

export default HolidayHeader;
