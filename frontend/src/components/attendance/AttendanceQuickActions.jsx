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
    <div className={`ui-card ui-card-body h-full ${className}`}>

      {/* Header */}
      <div className="mb-5">

        <h2 className="ui-card-title">
          Quick Actions
        </h2>

        <p className="ui-card-subtitle">
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
            className="group flex min-h-19 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line-subtle bg-surface-muted/50 p-3 text-left transition-all duration-200 hover:border-line hover:bg-surface-muted"
          >

            <div className="flex min-w-0 items-center gap-3">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${action.color}`}
              >
                <action.icon size={20} />
              </div>

              <div className="min-w-0">

                <p className="text-sm font-semibold text-ink-muted transition-colors group-hover:text-brand">
                  {action.title}
                </p>

                <p className="text-xs text-ink-subtle">
                  {action.description}
                </p>

              </div>

            </div>

            <FiChevronRight className="shrink-0 text-ink-faint transition-all duration-200 group-hover:translate-x-1 group-hover:text-brand" />

          </button>

        ))}

      </div>

    </div>
  );

}

export default AttendanceQuickActions;
