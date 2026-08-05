import { useEffect, useMemo, useState } from "react";
import { FiClock } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MonthlyAttendanceTable from "../../components/attendance/MonthlyAttendanceTable";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useMonthlyAttendance from "../../hooks/useMonthlyAttendance";
import {
  getMonthLabel,
  shiftMonth,
} from "../../utils/attendance/attendanceDate";
import {
  buildMonthlyReport,
  getMonthlySummary,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Monthly Attendance
|--------------------------------------------------------------------------
| Company wide totals per employee for the selected month. Search comes from
| the header search bar.
|--------------------------------------------------------------------------
*/

function MonthlyAttendance() {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const {
    directory,
    departments,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  const {
    records,
    loading: recordsLoading,
    error: recordsError,
    reload: reloadRecords,
  } = useMonthlyAttendance(companyCode, year, month);

  useEffect(() => {
    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const rows = useMemo(
    () => buildMonthlyReport(directory, records),
    [directory, records]
  );

  const summary = useMemo(() => getMonthlySummary(rows), [rows]);

  const currentLabel = getMonthLabel(year, month);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const handleMonthChange = (direction) => {

    const next = shiftMonth(year, month, direction);

    setYear(next.year);
    setMonth(next.month);

  };

  const handleRetry = () => {
    reloadDirectory();
    reloadRecords();
  };

  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Monthly Attendance"
        subtitle={`Company-wide monthly attendance for ${currentLabel}`}
        icon={<FiClock />}
      />

      <div className="mt-6 space-y-6">

        <AttendanceSummaryCards summary={summary} />

        <MonthlyAttendanceTable
          rows={rows}
          loading={directoryLoading || recordsLoading}
          error={directoryError || recordsError}
          onRetry={handleRetry}
          search={search}
          departments={departments}
          currentLabel={currentLabel}
          onMonthChange={handleMonthChange}
          disableNextMonth={isCurrentMonth}
        />

      </div>

    </div>
  );

}

export default MonthlyAttendance;
