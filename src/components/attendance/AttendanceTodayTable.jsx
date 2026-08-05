import { FiCalendar } from "react-icons/fi";

const badge = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Late: "bg-amber-50 text-amber-700 ring-amber-200",
  Absent: "bg-red-50 text-red-700 ring-red-200",
  Leave: "bg-blue-50 text-blue-700 ring-blue-200",
};

const dot = {
  Present: "bg-emerald-500",
  Late: "bg-amber-500",
  Absent: "bg-red-500",
  Leave: "bg-blue-500",
};

function AttendanceTodayTable({ attendance, loading }) {

  const presentCount = attendance.filter(
    (employee) => employee.status === "Present" || employee.status === "Late"
  ).length;
  const checkedOutCount = attendance.filter((employee) => employee.checkOut).length;

  const formatTime = (timestamp) => {

    if (!timestamp) return "--";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  };

  const getInitials = (name = "") => {

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-slate-500 font-medium">
          Loading today's attendance...
        </p>
      </div>
    );
  }

  if (attendance.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FiCalendar size={28} />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-slate-900">
          No Attendance Found
        </h2>

        <p className="mt-2 text-slate-500">
          No employee has checked in today.
        </p>

      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}

      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

        <div>

          <h2 className="text-xl font-semibold text-slate-900">
            Today's Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Live attendance of all employees
          </p>

        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">

          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />

          Live

        </span>

      </div>

      {/* Table */}

      <div className="max-h-[560px] overflow-auto">

        <table className="min-w-full">

          <thead className="sticky top-0 bg-slate-50 z-10">

            <tr className="border-b border-slate-200">

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Employee
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Check In
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Check Out
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Working Hours
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {attendance.map((employee, index) => (

              <tr
                key={employee.employeeId}
                className={`transition-all duration-200 hover:bg-slate-50 ${
                  index !== attendance.length - 1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >

                {/* Employee */}

                <td className="px-6 py-5">

                  <div className="flex items-center gap-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">

                      {getInitials(
                        employee.employeeName || employee.employeeId
                      )}

                    </div>

                    <div>

                      <p className="font-semibold text-slate-800">

                        {employee.employeeName || employee.employeeId}

                      </p>

                      <p className="text-sm text-slate-500">

                        {employee.employeeId}

                      </p>

                    </div>

                  </div>

                </td>

                {/* Check In */}

                <td className="px-6 py-5 font-medium text-slate-700">

                  {formatTime(employee.checkIn)}

                </td>

                {/* Check Out */}

                <td className="px-6 py-5 font-medium text-slate-700">

                  {formatTime(employee.checkOut)}

                </td>

                {/* Working Hours */}

                <td className="px-6 py-5">

                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">

                    {employee.workingHours || "--"}

                  </span>

                </td>

                {/* Status */}

                <td className="px-6 py-5">

                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                      badge[employee.status] || "bg-slate-100 text-slate-700 ring-slate-200"
                    }`}
                  >

                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        dot[employee.status] || "bg-slate-500"
                      }`}
                    />

                    {employee.status}

                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-200 bg-slate-50/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Checked in</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{presentCount} <span className="text-sm font-medium text-slate-500">of {attendance.length}</span></p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Checked out</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{checkedOutCount} <span className="text-sm font-medium text-slate-500">employees</span></p>
        </div>
        <div className="px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attendance status</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">Live data is up to date</p>
        </div>
      </div>

    </div>
  );
}

export default AttendanceTodayTable;
