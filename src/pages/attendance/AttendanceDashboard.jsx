import { useCallback, useMemo, useState } from "react";
import { toast } from "react-toastify";
import AttendanceAnalytics from "../../components/attendance/AttendanceAnalytics";
import AttendanceCalendar from "../../components/attendance/AttendanceCalender/AttendanceCalendar";
import AttendanceHeader from "../../components/attendance/AttendanceHeader";
import AttendanceQuickActions from "../../components/attendance/AttendanceQuickActions";
import AttendanceRecentActivity from "../../components/attendance/AttendanceRecentActivity";
import AttendanceRequests from "../../components/attendance/AttendanceRequests";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import AttendanceTodayTable from "../../components/attendance/AttendanceTodayTable";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import TodayAttendanceCard from "../../components/attendance/TodayAttendanceCard";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
import HolidayNotice from "../../components/holiday/HolidayNotice";
import WeeklyOffNotice from "../../components/holiday/WeeklyOffNotice";
import useAttendanceHistory from "../../hooks/useAttendanceHistory";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useRoleAccess from "../../hooks/useRoleAccess";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import {
  attachEmployeeDetails,
  getAttendanceActivities,
  getAttendanceAnalytics,
  getAttendanceSummary,
} from "../../utils/attendance/attendanceUtils";
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
| month calendar, analytics, the activity feed and the latest requests.
|
| Records store the employee id only, so they are joined with the employee
| directory once here and every panel below works from that.
|--------------------------------------------------------------------------
*/

const INSIGHT_SPANS = {
  1: "xl:col-span-12",
  2: "xl:col-span-6",
  3: "xl:col-span-4",
};

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
  const showSummary = canAccessSection("attendance.summary");
  const showToday = canAccessSection("attendance.today");
  const showCalendar = canAccessSection("attendance.calendar");
  const showActivity = canAccessSection("attendance.recentActivity");
  const showAnalytics = canAccessSection("attendance.analytics");
  const showRequests = canAccessSection("attendance.requests");

  /*
  | The insights row holds up to three panels across twelve columns. The span
  | is divided between however many survived the checks above, so two panels
  | are two halves rather than two thirds and a gap.
  */
  const insightCount =
    Number(showCalendar) + Number(showActivity) + Number(showAnalytics);

  /*
  | Written out rather than computed into a template string: Tailwind builds
  | its stylesheet by scanning the source for whole class names, and a class
  | assembled at runtime is never in the output.
  */
  const insightSpan = INSIGHT_SPANS[insightCount] || "";

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
    activeCount,
    loading: directoryLoading,
    error: directoryError,
    reload: reloadDirectory,
  } = useEmployeeDirectory(companyCode);

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
  | Today's year for the summary and the calendar's year for the tiles: the
  | calendar can be browsed into another year, and both are needed at once.
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

  /*
  | Attendance and requests are joined with the directory once, so the table,
  | the activity feed and the request card all read the same resolved names.
  */
  const records = useMemo(
    () => attachEmployeeDetails(attendance, directory),
    [attendance, directory]
  );

  /*
  | Reviewers see every request; everyone else only sees the ones they raised.
  */
  const detailedRequests = useMemo(() => {

    const detailed = attachEmployeeDetails(requests, directory);

    return isApprover(currentUser)
      ? detailed
      : filterOwnRequests(detailed, currentUser);

  }, [requests, directory, currentUser]);

  /*
  | On a day nobody was expected in - a declared holiday or a weekly off - the
  | roster is not turned into a list of absences, so both the cards and the
  | analytics are told what kind of day it is.
  */
  const dayOptions = useMemo(
    () => ({
      isNonWorkingDay: Boolean(todayHoliday) || todayWeeklyOff,
    }),
    [todayHoliday, todayWeeklyOff]
  );

  const summary = useMemo(
    () => getAttendanceSummary(records, activeCount, dayOptions),
    [records, activeCount, dayOptions]
  );

  const analytics = useMemo(
    () => getAttendanceAnalytics(records, activeCount, dayOptions),
    [records, activeCount, dayOptions]
  );

  const activities = useMemo(
    () => getAttendanceActivities(records),
    [records]
  );

  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  const handleMonthChange = useCallback((year, month) => {
    setCalendarMonth({ year, month });
  }, []);

  const handleApprove = async (request) => {

    if (!isApprover(currentUser)) {
      toast.error("You are not allowed to review requests.");
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
    <div className="mx-auto max-w-[1600px] space-y-6 p-1 sm:p-2">

      <AttendanceHeader
        onMarkAttendance={() => setMarkOpen(true)}
        canMarkAttendance={isApprover(currentUser)}
      />

      <HolidayNotice holiday={todayHoliday} label="Today" />

      {todayWeeklyOff && <WeeklyOffNotice date={todayKey} label="Today" />}

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">

        <div className={showSummary ? "xl:col-span-5" : "xl:col-span-12"}>
          <TodayAttendanceCard className="h-full" />
        </div>

        {showSummary && (
          <div className="xl:col-span-7">
            <AttendanceSummaryCards
              summary={summary}
              compact
              gridClassName="grid-cols-1 sm:grid-cols-2 sm:grid-rows-2"
            />
          </div>
        )}

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
          loading={attendanceLoading || directoryLoading}
          error={attendanceError || directoryError}
          onRetry={reloadDirectory}
        />
      )}

      <AttendanceQuickActions />

      {/* Insights */}
      {insightCount > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">

          {showCalendar && (
            <div className={insightSpan}>
              <AttendanceCalendar
                history={history}
                holidayDates={holidayDates}
                loading={calendarLoading}
                onMonthChange={handleMonthChange}
              />
            </div>
          )}

          {showActivity && (
            <div className={`lg:col-span-2 self-start ${insightSpan}`}>
              <AttendanceRecentActivity
                activities={activities}
                loading={attendanceLoading || directoryLoading}
              />
            </div>
          )}

          {showAnalytics && (
            <div className={`self-start ${insightSpan}`}>
              <AttendanceAnalytics analytics={analytics} />
            </div>
          )}

        </div>
      )}

      {/* Requests */}
      {showRequests && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">

          <div className="xl:col-span-12 self-start">
            <AttendanceRequests
              requests={detailedRequests}
              loading={requestsLoading || directoryLoading}
              currentUser={currentUser}
              onApprove={handleApprove}
              onReject={setRejectRequest}
            />
          </div>

        </div>
      )}

      <MarkAttendanceModal
        open={markOpen}
        onClose={() => setMarkOpen(false)}
        onSave={markAttendance}
        employees={activeEmployees}
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
