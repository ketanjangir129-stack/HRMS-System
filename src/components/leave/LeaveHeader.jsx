import { FiCheckSquare, FiPlus, FiRefreshCw } from "react-icons/fi";
import { MdOutlineBeachAccess } from "react-icons/md";
import { useNavigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Leave Header
|--------------------------------------------------------------------------
| The dashboard toolbar: the year the balance and the history are read for,
| a refresh, and the apply action.
|
| Balances are kept per year, so the selector drives every panel below it
| rather than only the balance cards.
|
| The approvals shortcut and the apply action are each rendered only when the
| role holds the matching permission, so neither is offered when the screen
| behind it is withheld.
|--------------------------------------------------------------------------
*/

function LeaveHeader({
  year,
  setYear,
  onApplyLeave,
  onRefresh,
  loading,
  canReview = false,
  canApply = true,
  pendingCount = 0,
}) {

  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();

  const years = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
  ];

  return (

    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-4">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-sm shadow-blue-600/20">
          <MdOutlineBeachAccess />
        </div>

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Leave Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage leave requests, balances and approvals.
          </p>

        </div>

      </div>

      <div className="flex flex-wrap items-center gap-3">

        <select
          value={year}
          onChange={(e) =>
            setYear(Number(e.target.value))
          }
          aria-label="Leave year"
          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >

          {years.map((item) => (

            <option
              key={item}
              value={item}
            >
              {item}
            </option>

          ))}

        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >

          <FiRefreshCw
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

        {canReview && (

          <button
            type="button"
            onClick={() => navigate("/leave/approvals")}
            className="relative inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
          >

            <FiCheckSquare />

            Approvals

            {pendingCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {pendingCount}
              </span>
            )}

          </button>

        )}

        {canApply && (

          <button
            type="button"
            onClick={onApplyLeave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
          >

            <FiPlus />

            Apply Leave

          </button>

        )}

      </div>

    </div>

  );

}

export default LeaveHeader;
