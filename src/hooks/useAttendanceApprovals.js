import { useCallback, useMemo } from "react";
import {
  approveAttendanceDay,
  saveAttendance,
  setAttendanceApproval,
} from "../services/attendanceServices/attendanceService";
import { APPROVAL_STATUS } from "../utils/attendance/attendanceConstants";
import {
  flattenMonthRecords,
  groupEmployeesByDate,
} from "../utils/attendance/attendanceApproval";
import useMonthlyAttendance from "./useMonthlyAttendance";

/*
|--------------------------------------------------------------------------
| Attendance Approvals
|--------------------------------------------------------------------------
| A month of recorded days and the four decisions that can be made about
| them, for the Attendance Approval screen.
|
| The month is read through `useMonthlyAttendance` rather than a fetch of its
| own: the whole month is a single node, so the queue, the reports and the
| monthly view are all served by one read and one cache path.
|
| That read is a one shot rather than a subscription - a month of records is
| not something to keep an open socket on - so every write reloads it. The
| service is the one that decides whether a decision may be written at all,
| and it re-reads the day before writing, so a row that somebody else decided
| in the meantime is refused there rather than being overwritten from a stale
| render here.
|
| Nothing in here asks who the reviewer is. The screen holds the department
| scope and decides which rows carry buttons; this hook writes what it is
| given, and the same rule is enforced again in `departmentScope` on the way
| in - see `AttendanceApprovals`.
|--------------------------------------------------------------------------
*/

const useAttendanceApprovals = (companyCode, year, month) => {

  const {
    records: monthRecords,
    loading,
    error,
    reload,
  } = useMonthlyAttendance(companyCode, year, month);

  const records = useMemo(
    () => flattenMonthRecords(monthRecords),
    [monthRecords]
  );

  /*
  | One decision on one day. Both buttons go through here so the payload is
  | built in a single place and a rejection can never be written without the
  | remarks the service insists on.
  */
  const decide = useCallback(
    async (record, status, approvedBy, remarks = "") => {

      const result = await setAttendanceApproval(companyCode, {
        date: record?.date,
        employeeId: record?.employeeId,
        status,
        approvedBy,
        remarks,
      });

      if (result?.success) {
        reload();
      }

      return result;

    },
    [companyCode, reload]
  );

  const approve = useCallback(
    (record, approvedBy) =>
      decide(record, APPROVAL_STATUS.APPROVED, approvedBy),
    [decide]
  );

  const reject = useCallback(
    (record, approvedBy, remarks) =>
      decide(record, APPROVAL_STATUS.REJECTED, approvedBy, remarks),
    [decide]
  );

  /*
  | Correcting what the day was, rather than deciding the day as recorded.
  |
  | It writes through `saveAttendance` - the same call the manual attendance
  | form makes - rather than a path of its own, so a day corrected on the
  | approval queue and a day marked by hand by HR are the same record
  | afterwards, signed off the same way and carrying the same fields. A second
  | writer for the same operation is how the two would eventually disagree
  | about what a corrected day looks like.
  |
  | The correction is the approval: only somebody entitled to decide the day
  | reaches this, and the service files it under their name.
  */
  const changeStatus = useCallback(
    async (record, approvedBy) => {

      const result = await saveAttendance(
        companyCode,
        record,
        approvedBy
      );

      if (result?.success) {
        reload();
      }

      return result;

    },
    [companyCode, reload]
  );

  /*
  | A selection signed off in one action. The service approves a day at a
  | time, so the selection is grouped back into its days and each day is one
  | multi location write - a fortnight of one employee's attendance is ten
  | writes rather than ten round trips per row.
  |
  | Only the days that are actually pending are touched, which is decided in
  | the service: a day already approved is left alone and a day that was
  | rejected is never quietly reinstated by somebody clearing the queue.
  */
  const approveMany = useCallback(
    async (rows = [], approvedBy) => {

      const groups = groupEmployeesByDate(rows);

      const dates = Object.keys(groups);

      if (dates.length === 0) {
        return { success: true, approved: 0 };
      }

      const results = await Promise.all(
        dates.map((date) =>
          approveAttendanceDay(
            companyCode,
            date,
            groups[date],
            approvedBy
          )
        )
      );

      const approved = results.reduce(
        (total, result) => total + (result?.approved || 0),
        0
      );

      if (approved > 0) {
        reload();
      }

      return { success: true, approved };

    },
    [companyCode, reload]
  );

  /*
  | The same for a rejection, one record at a time.
  |
  | There is no whole day equivalent in the service and there should not be:
  | approving a day the office worked normally is a routine sign off, while
  | turning attendance down takes a day away from somebody and needs a reason
  | that fits it. The reason is asked for once and carried onto each row, and
  | a row somebody else has already rejected is refused by the service and
  | reported back as skipped rather than counted.
  */
  const rejectMany = useCallback(
    async (rows = [], approvedBy, remarks = "") => {

      if (rows.length === 0) {
        return { success: true, rejected: 0, skipped: 0 };
      }

      if (!remarks.trim()) {
        return {
          success: false,
          message: "Remarks are required to reject attendance.",
        };
      }

      const results = await Promise.all(
        rows.map((record) =>
          setAttendanceApproval(companyCode, {
            date: record?.date,
            employeeId: record?.employeeId,
            status: APPROVAL_STATUS.REJECTED,
            approvedBy,
            remarks,
          })
        )
      );

      const rejected = results.filter(
        (result) => result?.success
      ).length;

      if (rejected > 0) {
        reload();
      }

      return {
        success: true,
        rejected,
        skipped: rows.length - rejected,
      };

    },
    [companyCode, reload]
  );

  return {
    records,
    loading,
    error,
    reload,
    approve,
    reject,
    changeStatus,
    approveMany,
    rejectMany,
  };

};

export default useAttendanceApprovals;
