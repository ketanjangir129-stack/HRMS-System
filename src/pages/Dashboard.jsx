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
    <div className="flex-1 p-8 bg-gray-100 min-h-full">
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
      <div className="grid grid-cols-2 gap-6">
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
              <FaUserTie className="text-4xl p-3 rounded-xl bg-blue-100 text-blue-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Employees
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaCog className="text-4xl p-3 rounded-xl bg-green-100 text-green-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Settings
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaGlobe className="text-4xl p-3 rounded-xl bg-orange-100 text-orange-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Departments
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaGraduationCap className="text-4xl p-3 rounded-xl bg-red-100 text-red-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Training
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaChartBar className="text-4xl p-3 rounded-xl bg-teal-100 text-teal-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Reports
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaImage className="text-4xl p-3 rounded-xl bg-pink-100 text-pink-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Media
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaBuilding className="text-4xl p-3 rounded-xl bg-cyan-100 text-cyan-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Offices
              </p>
            </div>

            <div className="flex flex-col items-center cursor-pointer">
              <FaShieldAlt className="text-4xl p-3 rounded-xl bg-gray-100 text-gray-600" />
              <p className="mt-2 text-sm font-medium text-gray-700">
                Security
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;