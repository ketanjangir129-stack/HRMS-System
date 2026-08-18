import { FiChevronRight } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import useAttendanceQuickActions from "../../hooks/useAttendanceQuickActions";

/*
|--------------------------------------------------------------------------
| Quick Actions
|--------------------------------------------------------------------------
| The actions this role is allowed to open, as cards. The card disappears
| entirely once nothing is left in it.
|--------------------------------------------------------------------------
*/

function AttendanceQuickActions({ className = "", gridClassName = "" }) {

  const navigate = useNavigate();

  const actions = useAttendanceQuickActions();

  if (actions.length === 0) return null;

  return (
    <div
      className={`h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >

      {/* Header */}
      <div className="mb-4">

        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          Quick Actions
        </h2>

        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Manage attendance modules
        </p>

      </div>

      {/*
      | Cards
      |
      | Three across at most. The list is five or six actions depending on the
      | role, and spreading them any thinner leaves a column too narrow to
      | hold "Monthly Attendance" on one line.
      |
      | Beside the punch card the column is narrower and the list is shorter,
      | so the caller can ask for fewer.
      */}
      <div
        className={
          gridClassName ||
          "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        }
      >

        {actions.map((action) => (

          <button
            key={action.title}
            type="button"
            onClick={() => navigate(action.path)}
            className="group flex min-h-19 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-left transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 sm:border-transparent"
          >

            <div className="flex min-w-0 items-center gap-3">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${action.color}`}
              >
                <action.icon size={20} />
              </div>

              <div className="min-w-0">

                <p className="text-sm font-semibold text-slate-800 transition-colors group-hover:text-blue-600">
                  {action.title}
                </p>

                <p className="text-xs text-slate-500">
                  {action.description}
                </p>

              </div>

            </div>

            <FiChevronRight className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-600" />

          </button>

        ))}

      </div>

    </div>
  );

}

export default AttendanceQuickActions;
