import { useEffect, useMemo, useState } from "react";
import { FiCalendar } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRecordsTable from "../../components/attendance/AttendanceRecordsTable";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import DepartmentScopeNotice from "../../components/common/DepartmentScopeNotice";
import HolidayNotice from "../../components/holiday/HolidayNotice";
import WeeklyOffNotice from "../../components/holiday/WeeklyOffNotice";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useManagerScope from "../../hooks/useManagerScope";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import { isApprover } from "../../utils/attendance/attendanceRequestUtils";
import {
  buildDailyReport,
  getAttendanceSummary,
} from "../../utils/attendance/attendanceUtils";
import { isWeeklyOff } from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
| Today's punch in and punch out records, kept in realtime. Search comes from
| the header search bar.
|
| This page reports the day; it no longer decides it. Signing a day off used
| to be an extra column here, which meant it could only ever be done for
| today, one row at a time, on a screen that exists to watch a morning rather
| than to review one - a day missed on Friday was a day nobody could reach on
| Monday. The whole review now lives on Attendance Approval, which reads a
| period rather than a day and can decide a set of days at once.
|
| The decision is still shown, read only. It is the reason the Present count
| and the Pending count differ, and a daily list that could not say which days
| were signed off would be reporting hours nobody has stood behind.
|
| On a declared holiday or a weekly off nobody is counted absent: the office
| was closed, so the roster is not turned into a list of absences and the
| banner says why the day is empty.
|
| A manager opens the same page narrowed to the departments they run. That
| narrowing is applied to the roster first and everything else is derived from
| it, so the table, the summary cards and the absent count are all describing
| one department and cannot disagree with each other.
|--------------------------------------------------------------------------
*/

function DailyAttendance() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const [markOpen, setMarkOpen] = useState(false);

  const {
    directory,
    departments,
    activeEmployees,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  /*
  | For an owner or an HR user every one of these passes its argument straight
  | back, so the page below reads the same for them as it did before the
  | manager role existed.
  */
  const {
    filterRows,
    filterEmployees,
    isScoped,
    departments: myDepartments,
    loading: scopeLoading,
  } = useManagerScope();

  const {
    attendance,
    loading,
    error,
    markAttendance,
  } = useDailyAttendance(companyCode);

  const today = getDateKey();

  /*
  | Only the running year is loaded: this page never shows another one.
  */
  const { holidayMap } = useHolidayDates(
    companyCode,
    useMemo(() => [new Date().getFullYear()], [])
  );

  const todayHoliday = holidayMap[today] || null;

  /*
  | A holiday that lands on a weekly off is explained once, as the holiday.
  */
  const todayWeeklyOff = !todayHoliday && isWeeklyOff(today);

  useEffect(() => {
    setSearchPlaceholder("Search employees by name, ID or department...");

    return () => {
      setSearch("");
      setSearchPlaceholder("Search...");
    };
  }, [setSearch, setSearchPlaceholder]);

  /*
  | The roster this page is about. Narrowing it here rather than at each of
  | the three places below is what keeps the denominator honest: the absent
  | count is the roster minus everybody accounted for, so a manager measuring
  | their eight people against a company of ninety would read as eighty two
  | absences every morning.
  */
  const scopedEmployees = useMemo(
    () => filterEmployees(activeEmployees),
    [filterEmployees, activeEmployees]
  );

  /*
  | The department filter offers only what the table can actually contain.
  | Left unnarrowed it would list every department in the company and every
  | one but the reviewer's own would filter the table down to nothing.
  */
  const departmentOptions = useMemo(
    () =>
      isScoped
        ? myDepartments.map((department) => department.name)
        : departments,
    [isScoped, myDepartments, departments]
  );

  const records = useMemo(
    () => filterRows(buildDailyReport(attendance, directory)),
    [filterRows, attendance, directory]
  );

  const summary = useMemo(
    () =>
      getAttendanceSummary(records, scopedEmployees.length, {
        isNonWorkingDay: Boolean(todayHoliday) || todayWeeklyOff,
      }),
    [records, scopedEmployees, todayHoliday, todayWeeklyOff]
  );

  /*
  | Marking a day by hand is still offered here: it records what a day was
  | rather than deciding a day somebody else recorded, and the form is only
  | opened by the roles that were always allowed to.
  */
  const canMarkAttendance = isApprover(currentUser);

  /*
  | The name a manually marked day is filed under, resolved the same way the
  | reviews resolve it so both read the same on a record.
  */
  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  /*
  | The decision, read only.
  |
  | `canReview: false` keeps the Approval column and its filter and takes both
  | buttons off every row, whoever is looking. The column stays because the
  | decision is worth reading here - it is why the Present count and the
  | Pending count differ, and a day of hours nobody has signed off should not
  | look the same as one that has been. Making it is a different act and now
  | belongs entirely to Attendance Approval, which can reach any day rather
  | than only today.
  */
  const approval = { canReview: false };

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Daily Attendance"
        subtitle="Track today's punch in and punch out records"
        icon={<FiCalendar />}
        action={
          /*
          | Back to the single button it was before the day was signed off
          | from here, at the widths it had: full width on a phone so it stays
          | thumb sized, its own size from `md`.
          */
          canMarkAttendance && (
            <button
              type="button"
              onClick={() => setMarkOpen(true)}
              className="ui-btn ui-btn-primary w-full font-semibold md:w-auto"
            >
              Mark Attendance
            </button>
          )
        }
      />

      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        {/*
        | Above the holiday banner, because it explains the whole page rather
        | than this one day of it.
        */}
        <DepartmentScopeNotice subject="attendance" />

        <HolidayNotice holiday={todayHoliday} label="Today" />

        {todayWeeklyOff && <WeeklyOffNotice date={today} label="Today" />}

        {/*
        | Five across from `xl` rather than four: the Pending card is the one
        | that explains a Present count that looks low, so it has to be beside
        | it and not wrapped onto a line of its own.
        */}
        <AttendanceSummaryCards
          summary={summary}
          showPending
          gridClassName="grid-cols-2 xl:grid-cols-5"
        />

        <AttendanceRecordsTable
          records={records}
          loading={loading || directoryLoading || scopeLoading}
          error={error || directoryError}
          onRetry={reloadDirectory}
          search={search}
          departments={departmentOptions}
          approval={approval}
          live
          emptyMessage={
            todayHoliday
              ? `Today is a holiday for ${todayHoliday.name}, so no attendance is expected.`
              : todayWeeklyOff
                ? "Today is a weekly off, so no attendance is expected."
                : "No employee has punched in today."
          }
          exportName="daily-attendance"
        />

      </div>

      <MarkAttendanceModal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        /*
        | HR marking a day by hand is itself the approval, so the day is
        | filed under whoever recorded it and never joins the queue.
        */
        onSave={(record) => markAttendance(record, actorName)}
        /*
        | The same narrowed roster the page is reporting on. Marking a day by
        | hand is an approval in itself, so the picker cannot offer somebody
        | this reviewer would not have been allowed to approve.
        */
        employees={scopedEmployees}
        dayRecords={records}
        recordsDate={today}
      />

    </div>
  );

}

export default DailyAttendance;
