import {
  FaUserTie,
  FaCog,
  FaGlobe,
  FaGraduationCap,
  FaChartBar,
  FaImage,
  FaBuilding,
  FaShieldAlt,
} from "react-icons/fa";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import EmployeeTasks from "../components/Tasks"
import QuickLinks from "../components/QuickLinks";
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
    <div className="flex-1 p-0 sm:p-2 bg-gray-100 min-h-full">
      {/* Welcome Section */}
      <div className="flex justify-between items-center mb-6 sm:mb-9">
        <div className="min-w-0">
          <p className="text-base sm:text-xl lg:text-2xl text-black mb-2 font-semibold">
            {today}
          </p>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-2 break-words">
            Hello, {displayName}
          </h1>

          <p className="text-sm sm:text-base text-gray-500">
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
        className={`grid grid-cols-1 gap-4 sm:gap-6 ${
          showTasks && showQuickLinks ? "xl:grid-cols-2" : ""
        }`}
      >
        {/* Today's Tasks */}
        {showTasks && <EmployeeTasks />}
        {/* Quick Find */}
        {showQuickLinks && <QuickLinks />}

      </div>
    </div>
  );
}

export default Dashboard;