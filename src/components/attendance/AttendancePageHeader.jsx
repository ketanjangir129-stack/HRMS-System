import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Attendance Page Header
|--------------------------------------------------------------------------
| The back button, the page icon and its title, with an optional action on
| the right.
|
| On a phone the title has to share the line with two buttons, so it starts
| small and grows with the viewport rather than wrapping "Monthly Attendance"
| across three lines under a 48px icon.
|--------------------------------------------------------------------------
*/

function AttendancePageHeader({ title, subtitle, icon, action }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        <button
          onClick={() => navigate("/attendance")}
          aria-label="Back to attendance"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600"
        >
          <FiArrowLeft size={18} />
        </button>

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
              {icon}
            </div>
          )}

          <div className="min-w-0">

            <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl lg:text-3xl">
              {title}
            </h1>

            <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm lg:text-base">
              {subtitle}
            </p>

          </div>

        </div>

      </div>

      {/* Its own line on a phone, beside the title from `md`. */}
      {action && <div className="shrink-0">{action}</div>}

    </div>
  );
}

export default AttendancePageHeader;
