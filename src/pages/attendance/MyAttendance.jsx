import { useMemo, useState } from "react";
import { FiUser, FiUserX } from "react-icons/fi";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import EmployeeReportTable from "../../components/attendance/reports/EmployeeReportTable";
import { MonthNavigator } from "../../components/attendance/common/AttendancePanel";
import useAttendanceHistory from "../../hooks/useAttendanceHistory";
import useAuth from "../../hooks/useAuth";
import useHolidayDates from "../../hooks/useHolidayDates";
import {
  getMonthDateKeys,
  getMonthLabel,
  shiftMonth,
} from "../../utils/attendance/attendanceDate";
import { getCurrentEmployeeId } from "../../utils/attendance/attendanceRequestUtils";
import {
  buildEmployeeReport,
  getAttendanceSummary,
} from "../../utils/attendance/attendanceUtils";

/*
|--------------------------------------------------------------------------
| My Attendance
|--------------------------------------------------------------------------
| The signed in employee's own month, one row per day, browsable back through
| earlier months.
|
| Only this employee's records are read. The company wide monthly page loads
| the whole directory and every record in the month, which is both far more
| than one person needs and other people's attendance; here the subscription
| is scoped to the one employee from the start.
|
| The employee's own details come from the signed in user rather than from the
| employee directory, so opening your own attendance does not download the
| roster to look up your name.
|--------------------------------------------------------------------------
*/

/*
| The cards count days here, not employees.
*/

const SUMMARY_SUBTITLES = {
  present: "Days Present",
  absent: "Days Absent",
  late: "Days Late",
  leave: "Days On Leave",
};

function MyAttendance() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const employeeId = getCurrentEmployeeId(currentUser);

  const today = useMemo(() => new Date(), []);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const {
    history,
    loading,
    error,
  } = useAttendanceHistory(companyCode, employeeId, year, month);

  const { holidayMap } = useHolidayDates(
    companyCode,
    useMemo(() => [year], [year])
  );

  /*
  | `buildEmployeeReport` reads a month the way the company wide pages hold
  | it, keyed by date and then by employee. The subscription returns a plain
  | list of this one employee's days, so it is put back into that shape here
  | and the same report builder serves both screens.
  */
  const monthRecords = useMemo(() => {

    const byDate = {};

    history.forEach((record) => {
      byDate[record.date] = { [employeeId]: record };
    });

    return byDate;

  }, [history, employeeId]);

  const rows = useMemo(
    () =>
      employeeId
        ? buildEmployeeReport(
          employeeId,
          monthRecords,
          getMonthDateKeys(year, month),
          holidayMap
        )
        : [],
    [employeeId, monthRecords, year, month, holidayMap]
  );

  /*
  | Counted over the days that have actually happened: the report stops at
  | today, so a rate is a share of the month so far and not of days nobody
  | has worked yet.
  */
  const summary = useMemo(
    () => getAttendanceSummary(rows),
    [rows]
  );

  const employee = useMemo(
    () => ({
      employeeId,
      name:
        currentUser?.personalInfo?.name ||
        currentUser?.employmentInfo?.name ||
        employeeId,
      department: currentUser?.employmentInfo?.department || "",
      designation: currentUser?.employmentInfo?.designation || "",
    }),
    [currentUser, employeeId]
  );

  const monthLabel = getMonthLabel(year, month);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  const handleMonthChange = (direction) => {

    const next = shiftMonth(year, month, direction);

    setYear(next.year);
    setMonth(next.month);

  };

  /*
  |--------------------------------------------------------------------------
  | No Employee Record
  |--------------------------------------------------------------------------
  | An owner signs in through Firebase Auth and carries no employee id, so
  | there is no attendance of their own to show. Saying so is better than an
  | empty month that looks like a month of absences.
  */

  if (!employeeId) {

    return (

      <div className="p-2">

        <AttendancePageHeader
          title="My Attendance"
          subtitle="Your day by day attendance"
          icon={<FiUser />}
        />

        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <FiUserX size={28} />
          </div>

          <h3 className="mt-5 text-xl font-semibold text-slate-900">
            No employee record linked
          </h3>

          <p className="mt-2 max-w-sm text-sm text-slate-500">
            This account is not linked to an employee, so it has no attendance
            of its own. Company wide attendance is on the monthly and report
            pages.
          </p>

        </div>

      </div>

    );

  }

  return (

    <div className="p-2">

      <AttendancePageHeader
        title="My Attendance"
        subtitle={`Your day by day attendance for ${monthLabel}`}
        icon={<FiUser />}
      />

      <div className="mt-6 space-y-6">

        <AttendanceSummaryCards
          summary={summary}
          subtitles={SUMMARY_SUBTITLES}
        />

        <EmployeeReportTable
          rows={rows}
          employee={employee}
          monthLabel={monthLabel}
          loading={loading}
          error={error}
          toolbar={
            <MonthNavigator
              label={monthLabel}
              onChange={handleMonthChange}
              disableNext={isCurrentMonth}
            />
          }
        />

      </div>

    </div>
  );

}

export default MyAttendance;
