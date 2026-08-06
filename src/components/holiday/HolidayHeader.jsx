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
|--------------------------------------------------------------------------
*/

function HolidayHeader({
  year,
  setYear,
  onAddHoliday,
  onRefresh,
  loading = false,
  totalHolidays = 0,
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

    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
          <FiCalendar />
        </div>

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Holiday Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {totalHolidays > 0
              ? `${totalHolidays} holiday${totalHolidays === 1 ? "" : "s"} declared for ${year}.`
              : "Declare and manage the company holiday calendar."}
          </p>

        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">

        <select
          value={year}
          onChange={(event) =>
            setYear(Number(event.target.value))
          }
          aria-label="Holiday year"
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >

          <FiRefreshCw
            className={loading ? "animate-spin" : ""}
          />

          Refresh

        </button>

        <button
          type="button"
          onClick={onAddHoliday}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
        >

          <FiPlus />

          Add Holiday

        </button>

      </div>

    </div>

  );

}

export default HolidayHeader;
