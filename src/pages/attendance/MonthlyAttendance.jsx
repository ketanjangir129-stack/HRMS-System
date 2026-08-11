import { useEffect, useMemo, useState } from "react";
import { FiClock, FiLock, FiUser } from "react-icons/fi";
import { Link, useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MonthlyAttendanceTable from "../../components/attendance/MonthlyAttendanceTable";
import useAuth from "../../hooks/useAuth";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useMonthlyAttendance from "../../hooks/useMonthlyAttendance";
import {
  getMonthLabel,
  shiftMonth,
} from "../../utils/attendance/attendanceDate";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";
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
|
| The whole company's month is on this page, so it is only opened for the
| roles that are meant to see it. Everyone else has their own month on
| `/attendance/my`.
|
| The restriction is not only a screen: the company code is withheld from
| the three hooks below, so an employee who reaches this route never fetches
| the directory or anybody else's records in the first place.
|
| Declared holidays are left out of the totals: a day the office was closed
| is not a working day, and counting it would drag every attendance rate down
| by a day nobody was expected in.
|--------------------------------------------------------------------------
*/

function MonthlyAttendance() {

  const { company, currentUser } = useAuth();

  const canView = isApprover(currentUser);

  const companyCode = canView ? company?.companyCode : "";

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

  const { holidayDates, reload: reloadHolidays } = useHolidayDates(
    companyCode,
    useMemo(() => [year], [year])
  );

  useEffect(() => {
    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const rows = useMemo(
    () => buildMonthlyReport(directory, records, holidayDates),
    [directory, records, holidayDates]
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
    reloadHolidays();
  };

  /*
  |--------------------------------------------------------------------------
  | Access
  |--------------------------------------------------------------------------
  | Rather than a dead end, the employee is pointed at the page that answers
  | what they came here for: their own month.
  */

  if (!canView) {

    return (

      <div className="p-0 sm:p-2">

        <AttendancePageHeader
          title="Monthly Attendance"
          subtitle="Company-wide monthly attendance"
          icon={<FiClock />}
        />

        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center shadow-sm sm:mt-6 sm:px-6 sm:py-20">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiLock size={28} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900 sm:text-xl">
            Monthly attendance is restricted
          </h3>

          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Only HR and the company owner can see every employee's month. Your
            own attendance is on My Attendance.
          </p>

          <Link
            to="/attendance/my"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30"
          >
            <FiUser />
            View My Attendance
          </Link>

        </div>

      </div>

    );

  }

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Monthly Attendance"
        subtitle={`Company-wide monthly attendance for ${currentLabel}`}
        icon={<FiClock />}
      />

      <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">

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
