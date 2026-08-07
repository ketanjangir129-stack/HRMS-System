import {
  FiBarChart2,
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiSettings,
  FiUser,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";

/*
|--------------------------------------------------------------------------
| Quick Actions
|--------------------------------------------------------------------------
| An action marked `approverOnly` opens a screen that holds the whole
| company's attendance, so it is left out for everyone else rather than
| offered and then refused on arrival.
|--------------------------------------------------------------------------
*/

const ACTIONS = [
  {
    title: "My Attendance",
    description: "Your month, day by day",
    icon: <FiUser size={20} />,
    color: "bg-indigo-50 text-indigo-600",
    path: "/attendance/my",
  },
  {
    title: "Daily Attendance",
    description: "View today's attendance",
    icon: <FiCalendar size={20} />,
    color: "bg-blue-50 text-blue-600",
    path: "/attendance/daily",
  },
  {
    title: "Monthly Attendance",
    description: "Every employee's month",
    icon: <FiClock size={20} />,
    color: "bg-emerald-50 text-emerald-600",
    path: "/attendance/monthly",
    approverOnly: true,
  },
  {
    title: "Requests",
    description: "Corrections and approvals",
    icon: <FiFileText size={20} />,
    color: "bg-amber-50 text-amber-600",
    path: "/attendance/requests",
  },
  {
    title: "Reports",
    description: "Attendance analytics",
    icon: <FiBarChart2 size={20} />,
    color: "bg-pink-50 text-pink-600",
    path: "/attendance/reports",
  },
  {
    title: "Settings",
    description: "Attendance preferences",
    icon: <FiSettings size={20} />,
    color: "bg-slate-100 text-slate-600",
    path: "/attendance/settings",
  },
];

function AttendanceQuickActions() {

  const navigate = useNavigate();

  const { currentUser } = useAuth();

  const canReview = isApprover(currentUser);

  const actions = ACTIONS.filter(
    (action) => canReview || !action.approverOnly
  );

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      {/* Header */}
      <div className="mb-4">

        <h2 className="text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Manage attendance modules
        </p>

      </div>

      {/*
      | Cards
      |
      | Three across at most. The list is five or six actions depending on the
      | role, and spreading them any thinner leaves a column too narrow to
      | hold "Monthly Attendance" on one line.
      */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">

        {actions.map((action) => (

          <button
            key={action.title}
            type="button"
            onClick={() => navigate(action.path)}
            className="group flex min-h-[76px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent p-3 text-left transition-all duration-200 hover:border-slate-200 hover:bg-slate-50"
          >

            <div className="flex min-w-0 items-center gap-3">

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${action.color}`}
              >
                {action.icon}
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
