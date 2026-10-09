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

/*
| The seven things a day can be, and after them the one thing a day can be
| waiting on. Pending is last because it is a mark drawn over a status rather
| than a status of its own. The order matches `STATUS_DOTS` so the colours read
| the same here as everywhere else a status is shown.
*/

const LEGEND = [
  { label: "Present", color: "bg-emerald-500" },
  { label: "Late", color: "bg-amber-500" },
  { label: "Absent", color: "bg-red-500" },
  { label: "Leave", color: "bg-blue-500" },
  { label: "Half Day", color: "bg-purple-500" },
  { label: "Holiday", color: "bg-teal-500" },
  { label: "Weekly Off", color: "bg-ink-faint" },
  {
    label: "Pending Approval",
    color: "bg-surface ring-2 ring-amber-500",
  },
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
    <div className="ui-card ui-card-body flex h-full flex-col">

      {/* Header */}
      <div className="mb-4">

        <h2 className="ui-card-title">
          Attendance Calendar
        </h2>

        <p className="ui-card-subtitle">
          Your monthly attendance overview
        </p>

      </div>

      {loading ? (

        <div aria-busy="true" aria-label="Loading calendar">

          <div className="mb-2 flex h-8.5 items-center justify-between">
            <div className="h-7 w-7 animate-pulse rounded-lg bg-surface-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
            <div className="h-7 w-7 animate-pulse rounded-lg bg-surface-muted" />
          </div>

          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="grid h-9.5 grid-cols-7 place-items-center">
              {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                <div
                  key={cell}
                  className="h-7.5 w-7.5 animate-pulse rounded-full bg-surface-muted"
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

      {/* Legend: one quiet wrapping line of dots, not a grid of chips */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">

        {LEGEND.map((item) => (

          <li
            key={item.label}
            className="flex items-center gap-1.5 text-[11px] font-medium text-ink-subtle"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
            {item.label}
          </li>

        ))}

      </ul>

    </div>
  );

}

export default AttendanceCalendar;
