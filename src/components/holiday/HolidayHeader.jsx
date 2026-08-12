import { FiCalendar, FiPlus, FiRefreshCw } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Holiday Header
|--------------------------------------------------------------------------
| The dashboard toolbar: the year every panel below is read for, a refresh,
| and the add action.
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

  return (

    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-3 sm:gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
          <FiCalendar />
        </div>

        <div className="min-w-0">

          <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
            Holiday Management
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">
            {totalHolidays > 0
              ? `${totalHolidays} holiday${totalHolidays === 1 ? "" : "s"} declared for ${year}.`
              : "Declare and manage the company holiday calendar."}
          </p>

        </div>

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
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">

        <select
          value={year}
          onChange={(event) =>
            setYear(Number(event.target.value))
          }
          aria-label="Holiday year"
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-auto sm:px-4"
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
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
            className="col-span-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
          >

            <FiPlus />

            Add Holiday

          </button>

        )}

      </div>

    </div>

  );

}

export default HolidayHeader;
