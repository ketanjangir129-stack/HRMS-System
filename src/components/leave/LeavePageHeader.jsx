import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Leave Page Header
|--------------------------------------------------------------------------
| Title bar for the pages under the leave dashboard, with the way back to it.
|--------------------------------------------------------------------------
*/

function LeavePageHeader({ title, subtitle, icon, action }) {

  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        <button
          type="button"
          onClick={() => navigate("/leave")}
          aria-label="Back to leave dashboard"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-500 hover:text-blue-600"
        >
          <FiArrowLeft size={18} />
        </button>

        {icon && (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20 sm:flex">
            {icon}
          </div>
        )}

        <div className="min-w-0">

          <h1 className="truncate text-2xl font-bold text-slate-900 sm:text-3xl">
            {title}
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {subtitle}
          </p>

        </div>

      </div>

      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {action}
        </div>
      )}

    </div>
  );

}

export default LeavePageHeader;
