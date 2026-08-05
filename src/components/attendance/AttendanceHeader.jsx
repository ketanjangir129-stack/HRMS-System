import {
  FiCalendar,
  FiPlus,
} from "react-icons/fi";

function AttendanceHeader({ onMarkAttendance, canMarkAttendance = true }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">

      {/* Left */}
      <div className="flex items-center gap-3 sm:gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
          <FiCalendar className="text-white text-xl" />
        </div>

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Attendance
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Attendance overview · {today}
          </p>

        </div>

      </div>

      {/* Right */}
      {canMarkAttendance && (
        <button
          type="button"
          onClick={onMarkAttendance}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 cursor-pointer whitespace-nowrap"
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
