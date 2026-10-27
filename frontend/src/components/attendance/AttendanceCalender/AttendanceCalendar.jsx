import { useCallback, useMemo, useState } from "react";
import Calendar from "react-calendar";
import { AlertCircle, CalendarCheck, Loader2 } from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "./AttendanceCalendar.css";
import {
  getDateKey,
  parseDateKey,
} from "../../../utils/attendance/attendanceDate";
import { getAttendanceCalendar } from "../../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Attendance Calendar
|--------------------------------------------------------------------------
| The signed in employee's month at a glance. Tiles are matched on a local
| `YYYY-MM-DD` key: `toISOString()` would convert to UTC first and shift every
| highlight by a day in positive offsets such as IST.
|
| The month on screen is owned by the parent (`year` / `month`), because the
| parent subscribes to that month's records. The calendar stays mounted while
| a month loads - unmounting it reset react-calendar to today's month, which is
| what made browsing snap back - and a loading veil is drawn over the grid.
|
| Absences are not stored, so they are derived from the month here (see
| `getAttendanceCalendar`) and only once the month's records have arrived:
| deriving them earlier would paint every past day red for a moment.
|--------------------------------------------------------------------------
*/

/*
| The order matches `STATUS_DOTS` so the colours read the same here as
| everywhere else a status is shown. Pending is last because it is a mark
| drawn over a status rather than a status of its own.
*/

const LEGEND = [
  { label: "Present", color: "bg-emerald-500" },
  { label: "Late", color: "bg-amber-500" },
  { label: "Absent", color: "bg-red-500" },
  { label: "Leave", color: "bg-indigo-500" },
  { label: "Half Day", color: "bg-purple-500" },
  { label: "Holiday", color: "bg-teal-500" },
  { label: "Weekly Off", color: "bg-ink-faint" },
  { label: "Pending Approval", color: "bg-surface ring-2 ring-amber-500" },
];

// What a holidays-only calendar (the owner's) can actually show.
const HOLIDAY_LEGEND = LEGEND.filter(({ label }) =>
  ["Holiday", "Weekly Off"].includes(label)
);

function AttendanceCalendar({
  year,
  month,
  history = [],
  holidayMap = {},
  leaveMap = {},
  joiningDate = "",
  // False for a login with no employee record (the owner): holidays only.
  showAttendance = true,
  loading = false,
  error = "",
  onMonthChange,
}) {

  const todayKey = getDateKey();

  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);

  /*
  | The grid's position. Month view follows the parent's month; the year view
  | (opened from the month label) browses on its own until a month is picked.
  */
  const [view, setView] = useState("month");
  const [yearViewStart, setYearViewStart] = useState(null);

  const activeStartDate =
    view === "month" || !yearViewStart
      ? new Date(year, month - 1, 1)
      : yearViewStart;

  const [selectedKey, setSelectedKey] = useState(todayKey);

  const calendar = useMemo(
    () =>
      loading
        ? {}
        : getAttendanceCalendar({
            year,
            month,
            history,
            holidayMap,
            leaveMap,
            joiningDate: joiningDate ? getDateKey(joiningDate) : "",
            today: todayKey,
            includeAttendance: showAttendance,
          }),
    [loading, year, month, history, holidayMap, leaveMap, joiningDate, todayKey, showAttendance]
  );

  const goToMonth = useCallback(
    (date) => {
      onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
    },
    [onMonthChange]
  );

  const handleActiveStartDateChange = ({ activeStartDate: next, view: nextView }) => {

    if (!next) return;

    if (nextView === "month") {
      setYearViewStart(null);
      goToMonth(next);
      return;
    }

    setYearViewStart(next);

  };

  const handleViewChange = ({ view: nextView, activeStartDate: next }) => {

    setView(nextView);

    /*
    | Picking January drills down to the date the year view already starts
    | on, so react-calendar skips onActiveStartDateChange; the month has to be
    | taken from here or the grid falls back to the previous month.
    */
    if (nextView === "month") {
      setYearViewStart(null);
      if (next) goToMonth(next);
      return;
    }

    setYearViewStart(next || new Date(year, 0, 1));

  };

  const handleToday = () => {
    setView("month");
    setYearViewStart(null);
    setSelectedKey(todayKey);
    goToMonth(today);
  };

  const isCurrentMonth =
    view === "month" &&
    year === today.getFullYear() &&
    month === today.getMonth() + 1;

  const selectedInMonth =
    selectedKey?.startsWith(`${year}-${String(month).padStart(2, "0")}-`);

  return (
    <div className="ui-card ui-card-body flex h-full flex-col">

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">

        <div>
          <h2 className="ui-card-title">Attendance Calendar</h2>
          <p className="ui-card-subtitle">
            {showAttendance
              ? "Your monthly attendance overview"
              : "Company holidays and weekly offs"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToday}
          disabled={isCurrentMonth}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface-muted disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Today
        </button>

      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Couldn&apos;t load attendance for this month. {error}
        </div>
      )}

      {/* The grid stays mounted; loading only veils it. */}
      <div className="relative" aria-busy={loading}>

        <Calendar
          className="attendance-calendar"
          locale="en-IN"
          view={view}
          minDetail="decade"
          activeStartDate={activeStartDate}
          onActiveStartDateChange={handleActiveStartDateChange}
          onViewChange={handleViewChange}
          value={selectedInMonth ? parseDateKey(selectedKey) : null}
          onClickDay={(date) => {
            setSelectedKey(getDateKey(date));
            // A neighbouring month's day takes you to that month.
            if (date.getMonth() !== month - 1) goToMonth(date);
          }}
          tileClassName={({ date, view: tileView }) =>
            tileView === "month" ? calendar[getDateKey(date)]?.className || "" : ""
          }
          tileContent={({ date, view: tileView }) => {
            if (tileView !== "month") return null;
            const day = calendar[getDateKey(date)];
            return day ? <span className="sr-only">{day.status}</span> : null;
          }}
        />

        {loading && (
          <div className="absolute inset-0 top-10.5 flex items-center justify-center rounded-lg bg-surface/70 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-brand" aria-label="Loading attendance" />
          </div>
        )}

      </div>

      {/* Legend */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4">
        {(showAttendance ? LEGEND : HOLIDAY_LEGEND).map((item) => (
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
