import {
  FiCalendar,
  FiPlus,
} from "react-icons/fi";

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
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between">

      {/* Left */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
          <FiCalendar className="text-lg text-white sm:text-xl" />
        </div>

        <div className="min-w-0">

          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            Attendance
          </h1>

          <p className="mt-0.5 truncate text-xs text-slate-500 sm:mt-1 sm:text-sm lg:text-base">
            <span className="hidden sm:inline">
              Attendance overview · {todayLong}
            </span>
            <span className="sm:hidden">{todayShort}</span>
          </p>

        </div>

      </div>

      {/* Right */}
      {canMarkAttendance && (
        <button
          type="button"
          onClick={onMarkAttendance}
          className="group inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 md:w-auto"
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
