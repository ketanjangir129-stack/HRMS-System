import { FiCalendar } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import EmployeeTasks from "../components/Tasks"
import QuickLinks from "../components/QuickLinks";
import UpcomingHolidayWidget from "../components/holiday/UpcomingHolidayWidget";
const Dashboard = () => {
  const { company, currentUser } = useAuth();
  const { canAccessSection } = useRoleAccess();

  const showTasks = canAccessSection("dashboard.tasks");
  const showQuickLinks = canAccessSection("dashboard.quickLinks");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const displayName = currentUser?.role === "owner"
    ? company?.details?.ownerName || currentUser?.name
    :
    currentUser?.personalInfo?.name ||
    currentUser?.employmentInfo?.name ||
    currentUser?.name || "Loading....";

  return (
    <div className="flex-1 min-h-full">
      {/* Welcome Section */}
      {/*
        The date leads as an eyebrow rather than a headline. It is context for
        the greeting under it, not the thing the page is about - so it is set
        small and in the brand hue, and the name gets the size instead.
      */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <FiCalendar className="shrink-0" size={14} />
            <span className="truncate">{today}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-ink wrap-break-word">
            Hello, {displayName}
          </h1>

          <p className="mt-1 text-sm text-ink-subtle">
            Here's what's happening with your HRMS today.
          </p>
        </div>
      </div>

      {/*
        Cards

        A withheld card is not rendered at all, so the grid drops to a single
        column rather than leaving the empty half its slot would keep.
      */}
      <div
        className={`grid gap-4 sm:gap-6 ${
          showTasks && showQuickLinks
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Today's Tasks */}
        {showTasks && <EmployeeTasks />}
        {/* Quick Find */}
        {showQuickLinks && <QuickLinks />}

        {/* Upcoming Holidays — same half width slot as the two cards above */}
        <UpcomingHolidayWidget />

      </div>
    </div>
  );
}

export default Dashboard;