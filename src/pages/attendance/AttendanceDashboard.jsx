import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AttendanceCalendar from "../../components/attendance/AttendanceCalender/AttendanceCalendar";
import AttendanceHeader from "../../components/attendance/AttendanceHeader";
import AttendanceQuickActions from "../../components/attendance/AttendanceQuickActions";
import AttendanceRequests from "../../components/attendance/AttendanceRequests";
import AttendanceTodayTable from "../../components/attendance/AttendanceTodayTable";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import TodayAttendanceCard from "../../components/attendance/TodayAttendanceCard";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
import HolidayNotice from "../../components/holiday/HolidayNotice";
import WeeklyOffNotice from "../../components/holiday/WeeklyOffNotice";
import useAttendanceHistory from "../../hooks/useAttendanceHistory";
import useAttendanceQuickActions from "../../hooks/useAttendanceQuickActions";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useManagerScope from "../../hooks/useManagerScope";
import useRoleAccess from "../../hooks/useRoleAccess";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import { attachEmployeeDetails } from "../../utils/attendance/attendanceUtils";
import { isWeeklyOff } from "../../utils/holiday/holidayUtils";
import {
  filterOwnRequests,
  getCurrentEmployeeId,
  isApprover,
} from "../../utils/attendance/attendanceRequestUtils";

/*
|--------------------------------------------------------------------------
| Attendance Dashboard
|--------------------------------------------------------------------------
| Today's attendance in realtime, the signed in user's own punch card, the
| month calendar and the latest requests.
|
| Records store the employee id only, so they are joined with the employee
| directory once here and every panel below works from that.
|
| For a manager that joined set is then narrowed to their departments before
| the table and requests read it, so their dashboard stays in scope end to end.
|--------------------------------------------------------------------------
*/

function AttendanceDashboard() {

  const { company, currentUser } = useAuth();

  const { canAccessSection } = useRoleAccess();

  const companyCode = company?.companyCode;

  const employeeId = getCurrentEmployeeId(currentUser);

  /*
  | Which panels this role is allowed to see. A withheld panel is left out of
  | the tree rather than hidden with a class, so its data is never rendered.
  |
  | The punch card is not one of them: it is the signed in user's own
  | attendance, which is the reason an employee opens this page at all.
  */
  const showToday = canAccessSection("attendance.today");
  const showCalendar = canAccessSection("attendance.calendar");
  const showRequests = canAccessSection("attendance.requests");

  /* Quick actions stay below the core day view, keeping punch in/out and the
     personal calendar as the dashboard's first, uncluttered decision area. */
  const quickActions = useAttendanceQuickActions();


  const [markOpen, setMarkOpen] = useState(false);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  const today = useMemo(() => new Date(), []);

  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }));

  const {
    directory,
    activeEmployees,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

  const {
    scope: reviewScope,
    canReview: canReviewRecord,
    filterRows,
    filterEmployees,
    loading: scopeLoading,
  } = useManagerScope();

  const {
    attendance,
    loading: attendanceLoading,
    error: attendanceError,
    markAttendance,
  } = useDailyAttendance(companyCode);

  const {
    requests,
    loading: requestsLoading,
    approve,
    reject,
  } = useAttendanceRequests(companyCode);

  const { history, loading: calendarLoading } = useAttendanceHistory(
    companyCode,
    employeeId,
    calendarMonth.year,
    calendarMonth.month
  );

  /*
  | Today is used for the notices; the calendar's year can be browsed
  | independently, so both years are loaded for holiday tiles.
  */
  const holidayYears = useMemo(
    () => [today.getFullYear(), calendarMonth.year],
    [today, calendarMonth.year]
  );

  const { holidayMap, holidayDates } = useHolidayDates(
    companyCode,
    holidayYears
  );

  const todayKey = getDateKey();

  const todayHoliday = holidayMap[todayKey] || null;

  /*
  | A holiday that lands on a weekly off is explained once, as the holiday:
  | it is the reason the office is closed, and two banners saying the same
  | thing is one banner too many.
  */
  const todayWeeklyOff = !todayHoliday && isWeeklyOff(todayKey);

  /* Attendance and requests are joined with the directory once, so the table
     and request card consistently use the same resolved employee names. */
  const records = useMemo(
    () => filterRows(attachEmployeeDetails(attendance, directory)),
    [filterRows, attendance, directory]
  );

  const scopedEmployees = useMemo(
    () => filterEmployees(activeEmployees),
    [filterEmployees, activeEmployees]
  );

  /*
  | Reviewers see every request; everyone else only sees the ones they raised.
  | A manager is a reviewer, so the scope is what narrows theirs.
  */
  const detailedRequests = useMemo(() => {

    const detailed = filterRows(
      attachEmployeeDetails(requests, directory)
    );

    return isApprover(currentUser)
      ? detailed
      : filterOwnRequests(detailed, currentUser);

  }, [filterRows, requests, directory, currentUser]);

  const actorName = currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  const handleMonthChange = useCallback((year, month) => {
    setCalendarMonth({ year, month });
  }, []);

  const handleApprove = async (request) => {

    /*
    | The card already withholds the button, so this is the second line and
    | not the first. It stays because the two answers must not be able to
    | drift: for a manager "allowed to review" also means "in one of my
    | departments, and not mine".
    */
    if (!isApprover(currentUser) || !canReviewRecord(request)) {
      toast.error("You are not allowed to review this request.");
      return;
    }

    try {

      const result = await approve(request, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve request.");
        return;
      }

      toast.success("Attendance request approved.");

    } catch (error) {

      console.error(error);
      toast.error("Failed to approve attendance request.");

    }

  };

  const handleReject = async (remarks) => {

    if (!rejectRequest) return;

    setRejecting(true);

    try {

      const result = await reject(
        rejectRequest,
        actorName,
        remarks
      );

      if (!result?.success) {
        toast.error(result?.message || "Failed to reject request.");
        return;
      }

      toast.success("Attendance request rejected.");
      setRejectRequest(null);

    } catch (error) {

      console.error(error);
      toast.error("Failed to reject attendance request.");

    } finally {

      setRejecting(false);

    }

  };

  return (
    <div className="mx-auto max-w-[1600px] p-0 sm:p-2">

      <AttendanceHeader
        onMarkAttendance={() => setMarkOpen(true)}
        canMarkAttendance={isApprover(currentUser)}
      />

      {/*
      | The heading is separated from the page the way the main Dashboard
      | separates its own: a wider gap under the title than between the panels
      | below it, so the greeting reads as the page's heading rather than as
      | the first card in the stack.
      */}
      <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">

        <HolidayNotice holiday={todayHoliday} label="Today" />

        {todayWeeklyOff && <WeeklyOffNotice date={todayKey} label="Today" />}

        <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 xl:grid-cols-12">
          {showCalendar && (
            <div className="xl:col-span-6">
              <AttendanceCalendar
                history={history}
                holidayDates={holidayDates}
                loading={calendarLoading}
                onMonthChange={handleMonthChange}
              />
            </div>
          )}

          <div className={showCalendar ? "xl:col-span-6" : "xl:col-span-12"}>
            <TodayAttendanceCard />
          </div>

        </div>

        {/*
        | Today
        |
        | The table gets the row to itself. Its six columns never fitted beside
        | another card: the status of a day sat behind a horizontal scrollbar,
        | and sharing a row also stretched the card to the height of whatever
        | was next to it, which left a block of empty white below a single row
        | of attendance.
        */}
        {showToday && (
          <AttendanceTodayTable
            attendance={records}
            loading={attendanceLoading || directoryLoading || scopeLoading}
            error={attendanceError || directoryError}
            onRetry={reloadDirectory}
          />
        )}

        {quickActions.length > 0 && <AttendanceQuickActions />}

        {/* Requests */}
        {showRequests && (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-12">

            <div className="xl:col-span-12 self-start">
              <AttendanceRequests
                requests={detailedRequests}
                loading={requestsLoading || directoryLoading || scopeLoading}
                currentUser={currentUser}
                reviewScope={reviewScope}
                onApprove={handleApprove}
                onReject={setRejectRequest}
              />
            </div>

          </div>
        )}

      </div>

      <MarkAttendanceModal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        /*
        | Only a reviewer can open this form, so marking a day by hand is
        | itself the approval and is filed under whoever recorded it.
        */
        onSave={(record) => markAttendance(record, actorName)}
        employees={scopedEmployees}
        dayRecords={records}
        recordsDate={getDateKey()}
      />

      <RejectRequestModal
        open={Boolean(rejectRequest)}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRequest?.employeeName}
      />

    </div>
  );

}

export default AttendanceDashboard;
