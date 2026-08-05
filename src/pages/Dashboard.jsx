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
import EmployeeTasks from "../components/Tasks"
import QuickLinks from "../components/QuickLinks";
const Dashboard = () => {
  const { company, currentUser } = useAuth();
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
    <div className="flex-1 p-2 bg-gray-100 min-h-full">
      {/* Welcome Section */}
      <div className="flex justify-between items-center mb-9">
        <div>
          <p className="text-2xl text-black mb-2 font-semibold">
            {today}
          </p>

          <h1 className="text-4xl font-bold text-green-600 mb-2">
            Hello, {displayName}
          </h1>

          <p className="text-gray-500">
            Here's what's happening with your HRMS today.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <EmployeeTasks />
        {/* Quick Find */}
        <QuickLinks />

      </div>
    </div>
  );
}

export default Dashboard;