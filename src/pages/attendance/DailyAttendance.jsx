import { useEffect, useMemo, useState } from "react";
import { FiCalendar, FiCheckCircle, FiLoader } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import AttendancePageHeader from "../../components/attendance/AttendancePageHeader";
import AttendanceRecordsTable from "../../components/attendance/AttendanceRecordsTable";
import AttendanceSummaryCards from "../../components/attendance/AttendanceSummaryCards";
import MarkAttendanceModal from "../../components/attendance/MarkAttendanceModal";
import RejectRequestModal from "../../components/attendance/requests/RejectRequestModal";
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
  getPendingApprovals,
} from "../../utils/attendance/attendanceUtils";
import { isWeeklyOff } from "../../utils/holiday/holidayUtils";

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
| Today's punch in and punch out records, kept in realtime. Search comes from
| the header search bar.
|
| This is also where the day is signed off. An employee punching in records
| what they say happened; until HR or the owner approves it the day counts as
| Pending and not as attendance, so the approving belongs on the page where
| the punches are already being read.
|
| On a declared holiday or a weekly off nobody is counted absent: the office
| was closed, so the roster is not turned into a list of absences and the
| banner says why the day is empty.
|
| A manager opens the same page narrowed to the departments they run. That
| narrowing is applied to the roster first and everything else is derived from
| it, so the table, the summary cards, the absent count and the "Approve All"
| button are all describing one department and cannot disagree with each other.
|--------------------------------------------------------------------------
*/

function DailyAttendance() {

  const { company, currentUser } = useAuth();

  const companyCode = company?.companyCode;

  const { search, setSearch, setSearchPlaceholder } = useOutletContext();

  const [markOpen, setMarkOpen] = useState(false);

  /*
  | The record being rejected, which is also what opens the remarks box, and
  | the row currently being written. The key is the row's own key, so only the
  | buttons of the day being decided are disabled and the rest of the list
  | stays usable while one write is in flight.
  */
  const [rejectRecord, setRejectRecord] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [approvingDay, setApprovingDay] = useState(false);

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
    canReview: canReviewRecord,
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
    approveAttendance,
    rejectAttendance,
    approveDay,
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

  const canReview = isApprover(currentUser);

  /*
  | What "Approve All" would actually decide, so the count on the button and
  | the write behind it are the same set. A manager's own pending day is on
  | the list above and not in here: it is theirs to see and HR's to sign off.
  */
  const pending = useMemo(
    () => getPendingApprovals(records).filter(canReviewRecord),
    [records, canReviewRecord]
  );

  /*
  | The name the decision is filed under, resolved the same way the request
  | reviews resolve it so both read the same on a record.
  */
  const actorName =
    currentUser?.personalInfo?.name || currentUser?.name || "Admin";

  const recordKey = (record) =>
    `${record?.date}-${record?.employeeId}`;

  const handleApprove = async (record) => {

    /*
    | The button is already withheld on a row that is not this reviewer's, so
    | this is the second line and not the first. It stays because the answer
    | must be the same wherever it is asked: a decision reached through a
    | stale render is still a decision that gets written.
    */
    if (!canReviewRecord(record)) {
      toast.error("This employee is not in a department you manage.");
      return;
    }

    setBusyKey(recordKey(record));

    try {

      const result = await approveAttendance(record, actorName);

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve attendance.");
        return;
      }

      toast.success(
        `${record.employeeName || record.employeeId}'s attendance approved.`
      );

    } catch (approveError) {

      console.error(approveError);
      toast.error("Failed to approve attendance.");

    } finally {

      setBusyKey("");

    }

  };

  const handleReject = async (remarks) => {

    if (!rejectRecord) return;

    if (!canReviewRecord(rejectRecord)) {
      toast.error("This employee is not in a department you manage.");
      setRejectRecord(null);
      return;
    }

    setRejecting(true);

    try {

      const result = await rejectAttendance(
        rejectRecord,
        actorName,
        remarks
      );

      if (!result?.success) {
        toast.error(result?.message || "Failed to reject attendance.");
        return;
      }

      toast.success("Attendance rejected.");
      setRejectRecord(null);

    } catch (rejectError) {

      console.error(rejectError);
      toast.error("Failed to reject attendance.");

    } finally {

      setRejecting(false);

    }

  };

  /*
  | The whole day in one action. The list is realtime, so what is pending is
  | read at the moment the button is pressed rather than from a count that was
  | rendered a minute ago, and the service skips anything already decided.
  */
  const handleApproveDay = async () => {

    setApprovingDay(true);

    try {

      const result = await approveDay(
        pending.map((record) => record.employeeId),
        actorName
      );

      if (!result?.success) {
        toast.error(result?.message || "Failed to approve the day.");
        return;
      }

      toast.success(
        result.approved === 0
          ? "Nothing was left to approve."
          : `${result.approved} ${result.approved === 1 ? "day" : "days"} of attendance approved.`
      );

    } catch (dayError) {

      console.error(dayError);
      toast.error("Failed to approve the day.");

    } finally {

      setApprovingDay(false);

    }

  };

  /*
  | Handed to the table only for a reviewer. Without it the column is not
  | rendered at all, so an employee who reaches this page never sees the
  | buttons rather than seeing them disabled.
  |
  | `canReview` goes down as a predicate rather than a boolean, so the column
  | is drawn for every row - the decision is worth reading on all of them -
  | while the two buttons appear only on the rows this reviewer may decide.
  */
  const approval = canReview
    ? {
      canReview: canReviewRecord,
      busyKey,
      onApprove: handleApprove,
      onReject: setRejectRecord,
    }
    : { canReview: false };

  return (
    <div className="p-0 sm:p-2">

      <AttendancePageHeader
        title="Daily Attendance"
        subtitle="Track today's punch in and punch out records"
        icon={<FiCalendar />}
        action={
          canReview && (
            /*
            | Stacked on a phone and side by side from `md`, the same widths
            | the single button had at each: two full width buttons under each
            | other is the only way both stay thumb sized on a narrow screen.
            */
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">

              {/*
              | Only offered when there is something to approve, and it says
              | how much: a button that reads "Approve All" over an empty
              | queue is a button that does nothing.
              */}
              {pending.length > 0 && (
                <button
                  type="button"
                  onClick={handleApproveDay}
                  disabled={approvingDay}
                  className="ui-btn w-full bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 md:w-auto"
                >
                  {approvingDay ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <FiCheckCircle />
                  )}
                  {approvingDay
                    ? "Approving..."
                    : `Approve All (${pending.length})`}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMarkOpen(true)}
                className="ui-btn ui-btn-primary w-full font-semibold md:w-auto"
              >
                Mark Attendance
              </button>

            </div>
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

      <RejectRequestModal
        open={Boolean(rejectRecord)}
        onClose={() => setRejectRecord(null)}
        onConfirm={handleReject}
        loading={rejecting}
        employeeName={rejectRecord?.employeeName}
        title="Reject Attendance"
        subject="attendance for this day"
        confirmLabel="Reject Attendance"
        placeholder="Enter the reason for rejecting this day of attendance..."
      />

    </div>
  );

}

export default DailyAttendance;
