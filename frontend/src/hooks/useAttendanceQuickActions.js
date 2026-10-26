import {
  FiBarChart2,
  FiCheckSquare,
  FiFileText,
  FiSettings,
  FiUploadCloud,
  FiUser,
} from "react-icons/fi";
import useRoleAccess from "./useRoleAccess";

/*
|--------------------------------------------------------------------------
| Attendance Quick Actions
|--------------------------------------------------------------------------
| Every action is a route, and every route is guarded, so each one is offered
| under the same permission that lets it open. An action the role cannot use
| is left out rather than shown and then refused on arrival.
|
| The list lives here rather than in the card because the dashboard decides
| where the card goes before it renders it, and an empty list renders no card
| at all - so it has to know what is left before laying the row out.
|--------------------------------------------------------------------------
*/

const ACTIONS = [
  {
    title: "My Attendance",
    description: "Your month, day by day",
    icon: FiUser,
    color: "bg-indigo-50 text-indigo-600",
    path: "/attendance/my",
    permission: "attendance.myAttendance",
  },
  /*
  | Signing a day off used to be an extra column beside today's punches on the
  | old daily list, which meant it could only ever be done for today and one
  | row at a time. A single day is now read on the daily report.
  */
  {
    title: "Attendance Approval",
    description: "Approve or reject recorded days",
    icon: FiCheckSquare,
    color: "bg-emerald-50 text-emerald-600",
    path: "/attendance/approvals",
    permission: "attendance.approvals",
  },
  // {
  //   title: "Monthly Attendance",
  //   description: "Every employee's month",
  //   icon: FiClock,
  //   color: "bg-emerald-50 text-emerald-600",
  //   path: "/attendance/monthly",
  //   permission: "attendance.monthly",
  // },
  {
    title: "Requests",
    description: "Corrections and approvals",
    icon: FiFileText,
    color: "bg-amber-50 text-amber-600",
    path: "/attendance/requests",
    permission: "attendance.requests",
  },
  {
    title: "Reports",
    description: "Attendance analytics",
    icon: FiBarChart2,
    color: "bg-pink-50 text-pink-600",
    path: "/attendance/reports",
    permission: "attendance.reports",
  },
  /*
  | Next to Settings rather than next to the daily screens: importing a year of
  | history is something a company does when it arrives, alongside configuring
  | the working day, and not part of running a week of attendance.
  */
  {
    title: "Import Attendance",
    description: "Migrate historical data",
    icon: FiUploadCloud,
    color: "bg-violet-50 text-violet-600",
    path: "/attendance/import",
    permission: "attendance.import",
  },
  {
    title: "Settings",
    description: "Attendance preferences",
    icon: FiSettings,
    color: "bg-slate-100 text-slate-600",
    path: "/attendance/settings",
    permission: "attendance.settings",
  },
];

function useAttendanceQuickActions() {

  const { canAccessSection } = useRoleAccess();

  return ACTIONS.filter(
    (action) => canAccessSection(action.permission)
  );

}

export default useAttendanceQuickActions;
