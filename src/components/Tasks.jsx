function EmployeeTasks() {
  return (
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
  );
}

export default EmployeeTasks;