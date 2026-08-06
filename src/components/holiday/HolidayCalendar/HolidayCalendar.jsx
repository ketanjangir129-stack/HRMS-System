import { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./HolidayCalendar.css";
import { getDateKey } from "../../../utils/attendance/attendanceDate";
import { HOLIDAY_CALENDAR_LEGEND } from "../../../utils/holiday/holidayConstants";
import {
  formatHolidayDateWithDay,
  getHolidayCalendarMap,
} from "../../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "../common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Holiday Calendar
|--------------------------------------------------------------------------
| The declared holidays of the selected year at a glance, built on the same
| calendar the leave module uses so the two look identical side by side.
|
| Tiles are matched on a local `YYYY-MM-DD` key: `toISOString()` converts to
| UTC first and would shift every highlight by a day in offsets such as IST.
|
| Selecting a highlighted day shows the holiday behind it, which is how a
| date is checked without scrolling to the table.
|--------------------------------------------------------------------------
*/

function HolidayCalendar({
  holidays = [],
  loading = false,
  year,
}) {

  const [value, setValue] = useState(() => new Date());

  const holidayByDate = useMemo(
    () => getHolidayCalendarMap(holidays),
    [holidays]
  );

  const selected = holidayByDate[getDateKey(value)] || null;

  /*
  | The selected year is browsed from its first day, so switching the year in
  | the header does not leave the calendar on a month of the previous one.
  */

  const activeStartDate = useMemo(() => {

    const today = new Date();

    return Number(year) === today.getFullYear()
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(year, 0, 1);

  }, [year]);

  return (

    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Header */}

      <div className="mb-5">

        <h2 className="text-lg font-semibold text-slate-900">
          Holiday Calendar
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Company holidays across {year}
        </p>

      </div>

      {loading ? (

        <div className="flex-1 space-y-3">

          <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100" />

          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                <div
                  key={cell}
                  className="h-8 animate-pulse rounded-md bg-slate-100"
                />
              ))}
            </div>
          ))}

        </div>

      ) : (

        <Calendar
          /*
          | Remounted per year so the calendar jumps to the selected year
          | instead of staying on the month it was last browsed to.
          */
          key={year}
          onChange={setValue}
          value={value}
          className="holiday-calendar"
          defaultActiveStartDate={activeStartDate}
          tileClassName={({ date, view }) =>
            view === "month"
              ? holidayByDate[getDateKey(date)]?.className || ""
              : ""
          }
        />

      )}

      {/* Selected day */}

      {!loading && selected && (

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="truncate text-sm font-semibold text-slate-800">
                {selected.holiday.name}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {formatHolidayDateWithDay(selected.holiday.date)}
                {selected.holiday.description
                  ? ` · ${selected.holiday.description}`
                  : ""}
              </p>

            </div>

            <HolidayTypeBadge
              type={selected.holiday.type}
              isOptional={selected.holiday.isOptional}
              size="sm"
            />

          </div>

        </div>

      )}

      {/* Legend */}

      <div className="mt-auto grid grid-cols-3 gap-2 pt-6">

        {HOLIDAY_CALENDAR_LEGEND.map((item) => (

          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
          >
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            {item.label}
          </div>

        ))}

      </div>

    </div>

  );

}

export default HolidayCalendar;
