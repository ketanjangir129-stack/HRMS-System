import { useMemo } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFilter,
  FiUsers,
  FiAlertTriangle,
} from "react-icons/fi";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

const formatRate = (rate) => `${rate}%`;

const rateColor = (rate) => {
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 75) return "bg-amber-500";
  return "bg-red-500";
};

function MonthlyAttendanceTable({
  rows = [],
  loading,
  error,
  onRetry,
  currentLabel,
  onMonthChange,
  search,
  departmentFilter,
  onDepartmentFilterChange,
}) {
  const departments = useMemo(
    () =>
      [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((r) => {
      const matchesSearch =
        !keyword ||
        r.name.toLowerCase().includes(keyword) ||
        r.employeeId.toLowerCase().includes(keyword) ||
        r.department.toLowerCase().includes(keyword);

      const matchesDept =
        !departmentFilter || r.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [rows, search, departmentFilter]);

  const handleExport = () => {
    const header = [
      "Employee ID",
      "Name",
      "Department",
      "Designation",
      "Working Days",
      "Present",
      "Late",
      "Absent",
      "Leave",
      "Attendance Rate (%)",
      "Total Working Hours",
    ];

    const body = filtered.map((r) => [
      r.employeeId,
      r.name,
      r.department,
      r.designation,
      r.workingDays,
      r.present,
      r.late,
      r.absent,
      r.leave,
      r.attendanceRate,
      r.workingHours,
    ]);

    const csv = [header, ...body]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-attendance-${currentLabel.replace(
      /\s+/g,
      "-"
    )}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h2 className="text-lg font-semibold text-slate-900">
            Employee Monthly Attendance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {search
              ? `${filtered.length} of ${rows.length} employees for ${currentLabel}`
              : `${rows.length} employees listed for ${currentLabel}`}
          </p>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">

          {/* Month Navigation */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">

            <button
              onClick={() => onMonthChange("prev")}
              title="Previous month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-white hover:text-blue-600 hover:shadow-sm"
            >
              <FiChevronLeft size={18} />
            </button>

            <span className="min-w-[130px] text-center text-sm font-semibold text-slate-700">
              {currentLabel}
            </span>

            <button
              onClick={() => onMonthChange("next")}
              title="Next month"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-white hover:text-blue-600 hover:shadow-sm"
            >
              <FiChevronRight size={18} />
            </button>

          </div>

          {/* Department Filter */}
          <div className="relative">

            <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <select
              value={departmentFilter}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
              className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:translate-y-0"
          >
            <FiDownload />
            Export
          </button>

        </div>

      </div>

      {/* Loading */}
      {loading ? (
        <div className="p-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-4 font-medium text-slate-500">
            Loading monthly attendance...
          </p>
        </div>
      ) : error ? (
        /* Error */
        <div className="p-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <FiAlertTriangle size={28} />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            Failed to Load
          </h3>
          <p className="mt-2 text-slate-500">{error}</p>
          <button
            onClick={onRetry}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <FiUsers size={28} />
          </div>
          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            {rows.length === 0
              ? "No Employees Found"
              : "No Matching Records"}
          </h3>
          <p className="mt-2 text-slate-500">
            {rows.length === 0
              ? "No employees are available in this company."
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">

          <table className="w-full border-collapse">

            <thead>

              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <th className="px-6 py-3 text-left font-semibold">
                  Employee
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Department
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Working Days
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Present
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Late
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Absent
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Leave
                </th>

                <th className="px-6 py-3 text-left font-semibold">
                  Attendance Rate
                </th>

                <th className="px-6 py-3 text-center font-semibold">
                  Hours
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

                        {getInitials(emp.name)}

                      </div>

                      <div>

                        <p className="font-semibold text-slate-800">
                          {emp.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {emp.employeeId}
                        </p>

                      </div>

                    </div>

                  </td>

                  {/* Department */}
                  <td className="px-6 py-4">

                    <p className="text-sm font-medium text-slate-700">
                      {emp.department || "—"}
                    </p>

                    <p className="text-xs text-slate-400">
                      {emp.designation || ""}
                    </p>

                  </td>

                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">
                    {emp.workingDays}
                  </td>

                  <td className="px-6 py-4 text-center">

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">
                      {emp.present}
                    </span>

                  </td>

                  <td className="px-6 py-4 text-center">

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-amber-200 bg-amber-50 text-amber-700">
                      {emp.late}
                    </span>

                  </td>

                  <td className="px-6 py-4 text-center">

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-red-200 bg-red-50 text-red-700">
                      {emp.absent}
                    </span>

                  </td>

                  <td className="px-6 py-4 text-center">

                    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-blue-200 bg-blue-50 text-blue-700">
                      {emp.leave}
                    </span>

                  </td>

                  {/* Attendance Rate */}
                  <td className="px-6 py-4">

                    <div className="flex items-center gap-3">

                      <div className="w-24">

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className={`h-full rounded-full transition-all duration-500 ${rateColor(emp.attendanceRate)}`}
                            style={{
                              width: `${emp.attendanceRate}%`,
                            }}
                          />

                        </div>

                      </div>

                      <span className="text-sm font-semibold text-slate-700">
                        {formatRate(emp.attendanceRate)}
                      </span>

                    </div>

                  </td>

                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-700">
                    {emp.workingHours || "—"}
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

export default MonthlyAttendanceTable;
