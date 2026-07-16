import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
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

function Dashboard() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Navbar />

        <div className="flex-1 p-8 bg-gray-100">
          {/* Welcome Section */}
          <div className="flex justify-between items-center mb-9">
            <div>
              <p className="text-sm text-black mb-2">
                Wednesday, July 15, 2026
              </p>

              <h1 className="text-4xl font-bold text-green-600 mb-2">
                Hello, Admin
              </h1>

              <p className="text-gray-500">
                Here's what's happening with your HRMS today.
              </p>
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-6 mt-8">
            {/* Today's Tasks */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Today's Tasks
                </h2>

                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                  View All
                </button>
              </div>

              <div className="flex items-center gap-4 py-4 border-b border-gray-200">
                <input type="checkbox" />
                <span className="text-gray-600">
                  Complete employee onboarding process
                </span>
              </div>

              <div className="flex items-center gap-4 py-4 border-b border-gray-200">
                <input type="checkbox" />
                <span className="text-gray-600">
                  Review leave requests
                </span>
              </div>

              <div className="flex items-center gap-4 py-4 border-b border-gray-200">
                <input type="checkbox" />
                <span className="text-gray-600">
                  Prepare monthly payroll report
                </span>
              </div>

              <div className="flex items-center gap-4 py-4">
                <input type="checkbox" />
                <span className="text-gray-600">
                  Conduct performance evaluations
                </span>
              </div>
            </div>

            {/* Quick Find */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Quick Find
              </h2>

              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col items-center cursor-pointer">
                  <FaUserTie className="text-blue-600 bg-blue-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Employees
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaCog className="text-green-600 bg-green-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Settings
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaGlobe className="text-orange-600 bg-orange-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Departments
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaGraduationCap className="text-red-600 bg-red-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Training
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaChartBar className="text-teal-600 bg-teal-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Reports
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaImage className="text-pink-600 bg-pink-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Media
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaBuilding className="text-cyan-600 bg-cyan-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Offices
                  </p>
                </div>

                <div className="flex flex-col items-center cursor-pointer">
                  <FaShieldAlt className="text-gray-600 bg-gray-100 text-4xl p-3 rounded-xl" />
                  <p className="mt-2 text-sm font-medium text-gray-700">
                    Security
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;