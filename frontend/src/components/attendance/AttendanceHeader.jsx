import { FiCalendar, FiPlus } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Attendance Header
|--------------------------------------------------------------------------
| The attendance module's top level header, written in the same anatomy the
| main Dashboard uses: a small brand coloured eyebrow carrying the context,
| the page name at heading size under it, then the one line that says what
| the page is for.
|
| No card and no filled icon tile. The Dashboard sets its heading directly on
| the page canvas, and a white strip around this one made the first thing on
| the page read as a panel of its own rather than as the page's title.
|--------------------------------------------------------------------------
*/

function AttendanceHeader({ onMarkAttendance, canMarkAttendance = true }) {

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
    <div className="flex flex-wrap items-center justify-between gap-4">

      <div className="min-w-0">

        <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">

          <FiCalendar className="shrink-0" size={14} />

          <span className="truncate">
            <span className="hidden sm:inline">{todayLong}</span>
            <span className="sm:hidden">{todayShort}</span>
          </span>

        </div>

        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Attendance
        </h1>

        <p className="mt-1 text-sm text-ink-subtle">
          Here's how attendance is looking today.
        </p>

      </div>

      {canMarkAttendance && (
        <button
          type="button"
          onClick={onMarkAttendance}
          className="ui-btn ui-btn-primary group w-full shrink-0 font-semibold md:w-auto"
        >

          <FiPlus
            size={18}
            className="transition-transform duration-200 group-hover:rotate-90"
          />

          Mark Attendance

        </button>
      )}

    </div>
  );
}

export default AttendanceHeader;
