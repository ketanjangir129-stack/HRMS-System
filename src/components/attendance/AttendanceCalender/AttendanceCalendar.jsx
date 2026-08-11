import { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./AttendanceCalendar.css";
import { getDateKey } from "../../../utils/attendance/attendanceDate";
import { getAttendanceCalendar } from "../../../utils/attendance/attendanceUtils";
import { isWeeklyOff } from "../../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Attendance Calendar
|--------------------------------------------------------------------------
| The signed in employee's month at a glance. Tiles are matched on a local
| `YYYY-MM-DD` key: `toISOString()` would convert to UTC first and shift every
| highlight by a day in positive offsets such as IST.
|
| Browsing to another month tells the parent, so it can subscribe to that
| month instead of loading the whole records tree.
|--------------------------------------------------------------------------
*/

const LEGEND = [
  { label: "Present", color: "bg-emerald-500" },
  { label: "Late", color: "bg-amber-500" },
  { label: "Absent", color: "bg-red-500" },
  { label: "Leave", color: "bg-blue-500" },
  { label: "Holiday", color: "bg-teal-500" },
  { label: "Weekly Off", color: "bg-slate-300" },
];

/*
| What a single tile is. A record wins over a holiday, a holiday wins over a
| weekly off: a day is described by the strongest thing known about it, so a
| Sunday somebody actually worked reads as the punch and not as the day off.
*/

const tileClass = (attendanceByDate, date) => {

  const key = getDateKey(date);

  return (
    attendanceByDate[key] ||
    (isWeeklyOff(key) ? "weekly-off" : "")
  );

};

function AttendanceCalendar({
  history = [],
  holidayDates = [],
  loading = false,
  onMonthChange,
}) {

  const [value, setValue] = useState(() => new Date());

  /*
  | Declared holidays are drawn under the records, so a day the office was
  | closed reads as a holiday instead of as a gap in the month.
  */
  const attendanceByDate = useMemo(
    () => getAttendanceCalendar(history, holidayDates),
    [history, holidayDates]
  );

  const handleActiveStartDateChange = ({ activeStartDate, view }) => {

    if (view !== "month" || !activeStartDate || !onMonthChange) return;

    onMonthChange(
      activeStartDate.getFullYear(),
      activeStartDate.getMonth() + 1
    );

  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">

      {/* Header */}
      <div className="mb-5">

        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          Attendance Calendar
        </h2>

        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Your monthly attendance overview
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
          onChange={setValue}
          value={value}
          className="attendance-calendar"
          onActiveStartDateChange={handleActiveStartDateChange}
          tileClassName={({ date, view }) =>
            view === "month"
              ? tileClass(attendanceByDate, date)
              : ""
          }
        />

      )}

      {/* Legend */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5 sm:grid-cols-3 sm:pt-6 xl:grid-cols-2">

        {LEGEND.map((item) => (

          <div
            key={item.label}
            className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] font-medium text-slate-600 sm:px-3 sm:text-xs"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
            <span className="truncate">{item.label}</span>
          </div>

        ))}

      </div>

    </div>
  );

}

export default AttendanceCalendar;
