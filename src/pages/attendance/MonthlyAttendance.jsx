import { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MonthlyAttendanceTable from "../../components/attendance/MonthlyAttendanceTable";
import useAuth from "../../hooks/useAuth";
import useMonthlyAttendance, {
  getMonthLabel,
} from "../../hooks/useMonthlyAttendance";

function MonthlyAttendance() {
  const { company } = useAuth();

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  // Selected month (defaults to current month)
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [departmentFilter, setDepartmentFilter] = useState("");

  const { rows, loading, error, reload } = useMonthlyAttendance(
    company?.companyCode,
    year,
    month
  );

  // Set the header search placeholder for this page
  useEffect(() => {
    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const currentLabel = getMonthLabel(year, month);

  const handleMonthChange = (direction) => {
    let nextMonth = month + (direction === "next" ? 1 : -1);
    let nextYear = year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    setMonth(nextMonth);
    setYear(nextYear);
    setDepartmentFilter("");
  };

  // Company-wide summary for the selected month
  const summary = {
    present: rows.reduce((acc, r) => acc + r.present, 0),
    late: rows.reduce((acc, r) => acc + r.late, 0),
    absent: rows.reduce((acc, r) => acc + r.absent, 0),
    leave: rows.reduce((acc, r) => acc + r.leave, 0),
    total: rows.reduce((acc, r) => acc + r.workingDays, 0),
  };

  const percentage = (value) => {
    if (summary.total === 0) return 0;
    return Math.round((value / summary.total) * 100);
  };

  summary.presentPercentage = percentage(summary.present);
  summary.absentPercentage = percentage(summary.absent);
  summary.latePercentage = percentage(summary.late);
  summary.leavePercentage = percentage(summary.leave);

  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Monthly Attendance"
        subtitle={`Company-wide monthly attendance for ${currentLabel}`}
        icon={<FiClock />}
      />

      <div className="mt-6">
        <AttendanceSummaryCards summary={summary} />
      </div>

      <div className="mt-6">
        <MonthlyAttendanceTable
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          currentLabel={currentLabel}
          onMonthChange={handleMonthChange}
          search={search}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
        />
      </div>

    </div>
  );
}

export default MonthlyAttendance;
