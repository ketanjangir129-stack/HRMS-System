import { useEffect, useMemo, useState } from "react";
import { FiBarChart2 } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRecordsTable from "../../components/attendance/AttendanceRecordsTable";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MonthlyAttendanceTable from "../../components/attendance/MonthlyAttendanceTable";
import { MonthNavigator } from "../../components/attendance/common/AttendancePanel";
import DepartmentReportTable from "../../components/attendance/reports/DepartmentReportTable";
import EmployeeReportTable from "../../components/attendance/reports/EmployeeReportTable";
import ReportTabs from "../../components/attendance/reports/ReportTabs";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useMonthlyAttendance from "../../hooks/useMonthlyAttendance";
import { REPORT_TYPE } from "../../utils/attendance/attendanceConstants";
import {
  getDateKey,
  getMonthDateKeys,
  getMonthLabel,
  shiftMonth,
} from "../../utils/attendance/attendanceDate";
import {
  buildDailyReport,
  buildDepartmentReport,
  buildEmployeeReport,
  buildMonthlyReport,
  getAttendanceSummary,
  getEmployeeDetails,
  getMonthlySummary,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| Attendance Reports
|--------------------------------------------------------------------------
| Daily, monthly, employee and department reports over one shared data load:
| the employee directory plus either the selected day or the selected month.
| Every table is derived from that with the attendance utilities, so nothing
| is fetched or calculated twice.
|
| Search comes from the header search bar.
|--------------------------------------------------------------------------
*/

const selectClass =
  "w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-64";

function AttendanceReports() {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const [reportType, setReportType] = useState(REPORT_TYPE.DAILY);
  const [date, setDate] = useState(() => getDateKey());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const isDaily = reportType === REPORT_TYPE.DAILY;

  const {
    directory,
    departments,
    activeCount,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  const {
    attendance: dayRecords,
    loading: dayLoading,
    error: dayError,
  } = useDailyAttendance(companyCode, isDaily ? date : "");

  /*
  | The daily report only needs the selected day, so the month is not fetched
  | while that tab is open.
  */
  const {
    records: monthRecords,
    loading: monthLoading,
    error: monthError,
    reload: reloadMonth,
  } = useMonthlyAttendance(
    isDaily ? "" : companyCode,
    year,
    month
  );

  useEffect(() => {
    setSearchPlaceholder("Search by employee, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  const monthLabel = getMonthLabel(year, month);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  /*
  |--------------------------------------------------------------------------
  | Derived Reports
  |--------------------------------------------------------------------------
  */

  const dailyRows = useMemo(
    () => buildDailyReport(dayRecords, directory),
    [dayRecords, directory]
  );

  const monthlyRows = useMemo(
    () => buildMonthlyReport(directory, monthRecords),
    [directory, monthRecords]
  );

  const departmentRows = useMemo(
    () => buildDepartmentReport(monthlyRows),
    [monthlyRows]
  );

  const employeeRows = useMemo(
    () =>
      selectedEmployeeId
        ? buildEmployeeReport(
          selectedEmployeeId,
          monthRecords,
          getMonthDateKeys(year, month)
        )
        : [],
    [selectedEmployeeId, monthRecords, year, month]
  );

  const summary = useMemo(
    () =>
      isDaily
        ? getAttendanceSummary(dailyRows, activeCount)
        : getMonthlySummary(monthlyRows),
    [isDaily, dailyRows, activeCount, monthlyRows]
  );

  const employees = useMemo(
    () =>
      Object.values(directory).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [directory]
  );

  const selectedEmployee = selectedEmployeeId
    ? getEmployeeDetails(directory, selectedEmployeeId)
    : null;

  const monthLoadingState = directoryLoading || monthLoading;

  const monthErrorState = directoryError || monthError;

  const handleMonthChange = (direction) => {

    const next = shiftMonth(year, month, direction);

    setYear(next.year);
    setMonth(next.month);

  };

  const reloadMonthly = () => {
    reloadDirectory();
    reloadMonth();
  };

  const monthToolbar = (
    <MonthNavigator
      label={monthLabel}
      onChange={handleMonthChange}
      disableNext={isCurrentMonth}
    />
  );

  return (
    <div className="p-2">

      <AttendancePageHeader
        title="Attendance Reports"
        subtitle="Daily, monthly, employee and department attendance reports"
        icon={<FiBarChart2 />}
      />

      <div className="mt-6 space-y-6">

        <ReportTabs value={reportType} onChange={setReportType} />

        <AttendanceSummaryCards summary={summary} />

        {isDaily && (
          <>
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">

              <label
                htmlFor="report-date"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Report date
              </label>

              <input
                id="report-date"
                type="date"
                value={date}
                max={getDateKey()}
                onChange={(event) => setDate(event.target.value)}
                className={selectClass}
              />

            </div>

            <AttendanceRecordsTable
              records={dailyRows}
              loading={directoryLoading || dayLoading}
              error={directoryError || dayError}
              onRetry={reloadDirectory}
              search={search}
              departments={departments}
              title="Daily Report"
              subtitle="Punch in and punch out for the selected day"
              exportName={`daily-attendance-${date}`}
              emptyMessage="No attendance was recorded on this day."
            />
          </>
        )}

        {reportType === REPORT_TYPE.MONTHLY && (
          <MonthlyAttendanceTable
            rows={monthlyRows}
            loading={monthLoadingState}
            error={monthErrorState}
            onRetry={reloadMonthly}
            search={search}
            departments={departments}
            currentLabel={monthLabel}
            onMonthChange={handleMonthChange}
            disableNextMonth={isCurrentMonth}
            title="Monthly Report"
          />
        )}

        {reportType === REPORT_TYPE.EMPLOYEE && (
          <EmployeeReportTable
            rows={employeeRows}
            employee={selectedEmployee}
            monthLabel={monthLabel}
            loading={monthLoadingState}
            error={monthErrorState}
            onRetry={reloadMonthly}
            toolbar={
              <>
                {monthToolbar}

                <select
                  value={selectedEmployeeId}
                  onChange={(event) =>
                    setSelectedEmployeeId(event.target.value)
                  }
                  aria-label="Select employee"
                  className={selectClass}
                >
                  <option value="">Select employee...</option>
                  {employees.map((employee) => (
                    <option
                      key={employee.employeeId}
                      value={employee.employeeId}
                    >
                      {employee.name} ({employee.employeeId})
                    </option>
                  ))}
                </select>
              </>
            }
          />
        )}

        {reportType === REPORT_TYPE.DEPARTMENT && (
          <DepartmentReportTable
            rows={departmentRows}
            monthLabel={monthLabel}
            search={search}
            loading={monthLoadingState}
            error={monthErrorState}
            onRetry={reloadMonthly}
            toolbar={monthToolbar}
          />
        )}

      </div>

    </div>
  );

}

export default AttendanceReports;
