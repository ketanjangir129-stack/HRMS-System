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
import useAttendanceQuickActions from "../../hooks/useAttendanceQuickActions";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import useAttendanceSettings from "../../hooks/useAttendanceSettings";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import useManagerScope from "../../hooks/useManagerScope";
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
|
| For a manager that joined set is then narrowed to their departments, once,
| before any of the panels read it. The summary cards, the analytics, the
| activity feed and the today table are all derived from it, so a manager's
| dashboard describes their department end to end instead of mixing a company
| wide rate into a departmental table.
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
  | Without the summary cards the punch card had the full width of the page to
  | itself and four values to put in it, so quick actions moves up beside it
  | and takes the columns the summary would have had. It only moves if there
  | is something in it: a role with no actions at all renders no card, and a
  | column reserved for nothing is the empty space this was meant to close.
  */
  const quickActions = useAttendanceQuickActions();

  const quickActionsBesideCard = !showSummary && quickActions.length > 0;

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

  /*
  | The company's working day, read once for the page. Only the analytics panel
  | uses it - to state the expected start time and to measure the hours
  | progress bar against a full day - so the read is skipped entirely when the
  | panel is withheld.
  |
  | Nothing else on this page needs it: every status it renders was decided by
  | the service when the punch was written and is read straight off the record.
  */
  const { settings: workRules } = useAttendanceSettings(showAnalytics);

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
    () => filterRows(attachEmployeeDetails(attendance, directory)),
    [filterRows, attendance, directory]
  );

  /*
  | The roster every rate on this page is measured against. It has to be the
  | same set the records above were narrowed to, or a manager's present rate
  | is their department divided by the whole company.
  */
  const scopedEmployees = useMemo(
    () => filterEmployees(activeEmployees),
    [filterEmployees, activeEmployees]
  );

  const activeCount = scopedEmployees.length;

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
    () =>
      getAttendanceAnalytics(records, activeCount, {
        ...dayOptions,
        workRules,
      }),
    [records, activeCount, dayOptions, workRules]
  );

  const activities = useMemo(
    () => getAttendanceActivities(records),
    [records]
  );

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

        <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-12">
          <div
            className={
              showSummary
                ? "xl:col-span-5"
                : quickActionsBesideCard
                  ? "xl:col-span-6"
                  : "xl:col-span-12"
            }
          >
            <TodayAttendanceCard className="h-full" />
          </div>

          {showSummary && (
            /*
            | Top aligned, not stretched: the punch card next to it is much
            | the taller of the two, and matching its height is what left the
            | four cards mostly empty. Aligned to the top they keep their own
            | size and their top edge lines up with the card beside them,
            | which is how the insight panels further down the page sit too.
            */
            <div className="self-start xl:col-span-7">
              <AttendanceSummaryCards
                summary={summary}
                compact
                gridClassName="grid-cols-2 sm:grid-rows-2"
              />
            </div>
          )}

          {quickActionsBesideCard && (
            <div className="xl:col-span-6">
              <AttendanceQuickActions gridClassName="grid grid-cols-1 gap-2" />
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
            loading={attendanceLoading || directoryLoading || scopeLoading}
            error={attendanceError || directoryError}
            onRetry={reloadDirectory}
          />
        )}

        {!quickActionsBesideCard && <AttendanceQuickActions />}

        {/* Insights */}
        {insightCount > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-12">

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
                <AttendanceAnalytics
                  analytics={analytics}
                  workRules={workRules}
                />
              </div>
            )}

          </div>
        )}

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
