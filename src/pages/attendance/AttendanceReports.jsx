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
import SearchableSelect from "../../components/common/SearchableSelect";
import HolidayNotice from "../../components/holiday/HolidayNotice";
import WeeklyOffNotice from "../../components/holiday/WeeklyOffNotice";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
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
import { isWeeklyOff } from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Attendance Reports
|--------------------------------------------------------------------------
| Daily, monthly, employee and department reports over one shared data load:
| the employee directory, the holiday calendar, plus either the selected day
| or the selected month. Every table is derived from that with the attendance
| utilities, so nothing is fetched or calculated twice.
|
| Holidays are left out of every total: a day the office was closed is not a
| working day, so it neither counts against an attendance rate nor turns into
| an absence on the day by day report.
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

  /*
  | The daily tab reads the selected day's year, the other three read the
  | month's. Both are requested together so switching tabs does not refetch.
  */
  const {
    holidayDates,
    holidayMap,
    reload: reloadHolidays,
  } = useHolidayDates(
    companyCode,
    useMemo(
      () => [Number(String(date).slice(0, 4)), year],
      [date, year]
    )
  );

  const selectedDayHoliday = holidayMap[date] || null;

  /*
  | A holiday that lands on a weekly off is explained once, as the holiday.
  */
  const selectedDayWeeklyOff =
    !selectedDayHoliday && isWeeklyOff(date);

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
    () => buildMonthlyReport(directory, monthRecords, holidayDates),
    [directory, monthRecords, holidayDates]
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
          getMonthDateKeys(year, month),
          holidayMap
        )
        : [],
    [selectedEmployeeId, monthRecords, year, month, holidayMap]
  );

  const summary = useMemo(
    () =>
      isDaily
        ? getAttendanceSummary(dailyRows, activeCount, {
          isNonWorkingDay:
            Boolean(selectedDayHoliday) || selectedDayWeeklyOff,
        })
        : getMonthlySummary(monthlyRows),
    [
      isDaily,
      dailyRows,
      activeCount,
      monthlyRows,
      selectedDayHoliday,
      selectedDayWeeklyOff,
    ]
  );

  const employees = useMemo(
    () =>
      Object.values(directory).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [directory]
  );

  /*
  | The directory can hold hundreds of people, so the report picker is a
  | searchable list rather than a plain dropdown.
  */
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: employee.employeeId,
        label: `${employee.name} (${employee.employeeId})`,
      })),
    [employees]
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
    reloadHolidays();
  };

  const monthToolbar = (
    <MonthNavigator
      label={monthLabel}
      onChange={handleMonthChange}
      disableNext={isCurrentMonth}
    />
  );

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Attendance Reports"
        subtitle="Daily, monthly, employee and department attendance reports"
        icon={<FiBarChart2 />}
      />

      <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-6">

        <ReportTabs value={reportType} onChange={setReportType} />

        <AttendanceSummaryCards summary={summary} />

        {isDaily && (
          <>
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-6">

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

            <HolidayNotice
              holiday={selectedDayHoliday}
              label="The selected day"
            />

            {selectedDayWeeklyOff && (
              <WeeklyOffNotice
                date={date}
                label="The selected day"
              />
            )}

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
              emptyMessage={
                selectedDayHoliday
                  ? `The office was closed for ${selectedDayHoliday.name}, so no attendance was expected.`
                  : selectedDayWeeklyOff
                    ? "This day is a weekly off, so no attendance was expected."
                    : "No attendance was recorded on this day."
              }
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

                <SearchableSelect
                  options={employeeOptions}
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  placeholder="Select employee..."
                  searchPlaceholder="Search by name or ID..."
                  emptyMessage="No employees found"
                  ariaLabel="Select employee"
                  allowClear
                  className={selectClass}
                />
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
