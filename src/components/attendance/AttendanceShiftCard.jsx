import {
  FaBusinessTime,
  FaClock,
  FaUsers,
  FaArrowRight,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useTodayAttendance from "../../hooks/useTodayAttendance";

function AttendanceShiftCard() {

  const navigate = useNavigate();
  const { company } = useAuth();
  const { attendance, loading } = useTodayAttendance(company?.companyCode);

  // Determine the active shift label from the shift timing of present employees.
  const shiftLabel = loading || attendance.length === 0
    ? "Morning Shift"
    : "General Shift";

  // Compute the number of employees that have attendance records today.
  const assignedEmployees = loading ? 0 : attendance.length;

// Shift is considered active when there is at least one attendance record today.
  const isActive = !loading && attendance.length > 0;

// Derive the shift timing from the earliest check-in to the latest check-out.
  const computedTiming = (() => {
    if (loading || attendance.length === 0) return "09:00 AM - 06:00 PM";

    const checkIns = attendance
      .map((emp) => emp.checkIn)
      .filter(Boolean)
      .sort((a, b) => a - b);
    const checkOuts = attendance
      .map((emp) => emp.checkOut)
      .filter(Boolean)
      .sort((a, b) => b - a);

    if (checkIns.length === 0) return "09:00 AM - 06:00 PM";

    const format = (ts) =>
      new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    const start = format(checkIns[0]);
    const end = checkOuts.length > 0 ? format(checkOuts[0]) : "06:00 PM";
    return `${start} - ${end}`;
  })();

  return (

    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-start justify-between gap-4">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50">

            <FaBusinessTime className="text-xl text-blue-600" />

          </div>

          <div>

<h2 className="text-lg font-semibold text-slate-900">
              Today's Shift
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {shiftLabel} Overview
            </p>

          </div>

        </div>

        <button
          onClick={() => navigate("/attendance/shifts")}
          className="group cursor-pointer rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <FaArrowRight className="text-sm transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>

      </div>

      <div className="space-y-3">

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">

          <div className="flex items-center gap-3">

            <FaClock className="text-emerald-600" />

            <span className="text-sm text-slate-600">
              Shift Timing
            </span>

          </div>

<span className="text-sm font-semibold text-slate-900">
            {computedTiming}
          </span>

        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">

          <div className="flex items-center gap-3">

            <FaUsers className="text-blue-600" />

            <span className="text-sm text-slate-600">
              Assigned Employees
            </span>

          </div>

<span className="text-sm font-semibold text-slate-900">
            {assignedEmployees}
          </span>

        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">

          <span className="text-sm text-slate-600">
            Shift Status
          </span>

<span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-slate-50 text-slate-600 ring-slate-200"
            }`}>

            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />

            {isActive ? "Active" : "Inactive"}

          </span>

        </div>

      </div>

      <div className="mt-auto pt-6">

        <button
          onClick={() => navigate("/attendance/shifts")}
          className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
        >
          Manage Shifts
        </button>

      </div>

    </div>

  );
}

export default AttendanceShiftCard;
