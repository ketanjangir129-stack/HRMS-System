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
import useAttendanceHistory from "../../hooks/useAttendanceHistory";
import useAttendanceRequests from "../../hooks/useAttendanceRequests";
import useAuth from "../../hooks/useAuth";
import useDailyAttendance from "../../hooks/useDailyAttendance";
import useEmployeeDirectory from "../../hooks/useEmployeeDirectory";
import useHolidayDates from "../../hooks/useHolidayDates";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import {
  attachEmployeeDetails,
  getAttendanceActivities,
  getAttendanceAnalytics,
  getAttendanceSummary,
} from "../../utils/attendance/attendanceUtils";
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

function AttendanceDashboard() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const employeeId = getCurrentEmployeeId(currentUser);

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

  const todayHoliday = holidayMap[getDateKey()] || null;

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
  | On a declared holiday the roster is not turned into a list of absences,
  | so both the cards and the analytics are told what kind of day it is.
  */
  const holidayOptions = useMemo(
    () => ({ isHoliday: Boolean(todayHoliday) }),
    [todayHoliday]
  );

  const summary = useMemo(
    () => getAttendanceSummary(records, activeCount, holidayOptions),
    [records, activeCount, holidayOptions]
  );

  const analytics = useMemo(
    () => getAttendanceAnalytics(records, activeCount, holidayOptions),
    [records, activeCount, holidayOptions]
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

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">

        <div className="xl:col-span-5">
          <TodayAttendanceCard className="h-full" />
        </div>

        <div className="xl:col-span-7">
          <AttendanceSummaryCards
            summary={summary}
            compact
            gridClassName="grid-cols-1 sm:grid-cols-2 sm:grid-rows-2"
          />
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
      <AttendanceTodayTable
        attendance={records}
        loading={attendanceLoading || directoryLoading}
        error={attendanceError || directoryError}
        onRetry={reloadDirectory}
      />

      <AttendanceQuickActions />

      {/* Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">

        <div className="xl:col-span-4">
          <AttendanceCalendar
            history={history}
            holidayDates={holidayDates}
            loading={calendarLoading}
            onMonthChange={handleMonthChange}
          />
        </div>

         <div className="lg:col-span-2 xl:col-span-4 self-start">
          <AttendanceRecentActivity
            activities={activities}
            loading={attendanceLoading || directoryLoading}
          />
        </div>

        <div className="xl:col-span-4 self-start">
          <AttendanceAnalytics analytics={analytics} />
        </div>

      </div>

      {/* Requests */}
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
