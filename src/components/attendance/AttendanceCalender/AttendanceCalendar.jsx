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
| than a status of its own.
|
| Seven leaves an odd cell at two columns and two spare at three, so Pending
| takes exactly the room that is left at each: one cell where the seven wrap
| odd, two where they wrap short. Every breakpoint fills its last row, and the
| order matches `STATUS_DOTS` so the colours read the same here as everywhere
| else a status is shown.
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
    span: "sm:col-span-2 xl:col-span-1",
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
      <div className="mb-5">

        <h2 className="ui-card-title">
          Attendance Calendar
        </h2>

        <p className="ui-card-subtitle">
          Your monthly attendance overview
        </p>

      </div>

      {loading ? (

        <div className="flex-1 space-y-3">

          <div className="h-8 w-full animate-pulse rounded-lg bg-surface-muted" />

          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="grid grid-cols-7 gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((cell) => (
                <div
                  key={cell}
                  className="h-8 animate-pulse rounded-md bg-surface-muted"
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
            className={`flex items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-2 text-[11px] font-medium text-ink-muted sm:px-3 sm:text-xs ${item.span || ""}`}
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
