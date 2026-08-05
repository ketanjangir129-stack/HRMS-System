import { useState } from "react";
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiEye,
  FiCalendar,
} from "react-icons/fi";

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

function AttendanceReportCard({
  attendance = [],
  loading,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const formatTime = (timestamp) => {
    if (!timestamp) return "--";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  // Filter logic
  const filtered = attendance.filter((emp) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      (emp.employeeName || "").toLowerCase().includes(keyword) ||
      (emp.employeeId || "").toLowerCase().includes(keyword) ||
      (emp.department || "").toLowerCase().includes(keyword);
    const matchesStatus =
      !statusFilter || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // CSV Export
  const handleExport = () => {
    const header = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Check In",
      "Check Out",
      "Working Hours",
      "Status",
    ];
    const rows = filtered.map((emp) => [
      emp.employeeId || "",
      emp.employeeName || "",
      emp.department || "",
      formatTime(emp.checkIn),
      formatTime(emp.checkOut),
      emp.workingHours || "--",
      emp.status || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${new Date()
      .toISOString()
      .split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="mt-4 text-slate-500 font-medium">
          Loading attendance report...
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Header */}

      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h2 className="text-lg font-semibold text-slate-900">
            Today's Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Live attendance status of employees
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Search */}

          <div className="relative">

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-56"
            />

          </div>

          {/* Filter */}

          <div className="relative">

            <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>

          </div>

          <button
            onClick={handleExport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:translate-y-0"
          >
            <FiDownload />
            Export
          </button>

        </div>

      </div>

      {/* Empty State */}

      {filtered.length === 0 ? (
        <div className="p-16 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiCalendar size={28} />
          </div>

          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            {attendance.length === 0
              ? "No Attendance Found"
              : "No Matching Records"}
          </h3>

          <p className="mt-2 text-slate-500">
            {attendance.length === 0
              ? "No employee has checked in today."
              : "Try adjusting your search or filter criteria."}
          </p>

        </div>
      ) : (
        /* Table */

        <div className="overflow-x-auto">

          <table className="w-full min-w-200 border-collapse">

            <thead>

              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <th className="px-6 py-3 text-left font-semibold">
                  Employee
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Check In
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Check Out
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Working Hours
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Status
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {filtered.map((emp) => (

                <tr
                  key={emp.employeeId}
                  className="group transition-colors hover:bg-slate-50"
                >

                  {/* Employee */}

                  <td className="px-6 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">

                        {getInitials(emp.employeeName || emp.employeeId)}

                      </div>

                      <div>

                        <p className="font-semibold text-slate-800">
                          {emp.employeeName || emp.employeeId}
                        </p>

                        <p className="text-xs text-slate-500">
                          {emp.employeeId}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {formatTime(emp.checkIn)}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {formatTime(emp.checkOut)}
                  </td>

                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {emp.workingHours || "--"}
                  </td>

                  <td className="px-6 py-4">

                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        badge[emp.status] || "bg-slate-100 text-slate-700 ring-slate-200"
                      }`}
                    >

                      <span className={`h-1.5 w-1.5 rounded-full ${dot[emp.status] || "bg-slate-500"}`} />

                      {emp.status}

                    </span>

                  </td>

                  <td className="px-6 py-4 text-center">

                    <button
                      title="View details"
                      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <FiEye size={16} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      )}

    </div>
  );
}

export default AttendanceReportCard;
