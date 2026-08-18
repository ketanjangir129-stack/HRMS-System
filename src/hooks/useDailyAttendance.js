import { useCallback, useEffect, useState } from "react";
import {
  approveAttendanceDay,
  saveAttendance,
  setAttendanceApproval,
  subscribeToDailyAttendance,
} from "../services/attendanceServices/attendanceService";
import { getDateKey } from "../utils/attendance/attendanceDate";
import { APPROVAL_STATUS } from "../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Daily Attendance
|--------------------------------------------------------------------------
| Every attendance record of a single day, kept in realtime so a punch in or
| punch out shows up without a refresh. Defaults to today.
|
| The delivered data is stored together with the request it answers, so
| loading is derived instead of being set from inside the effect and stale
| records are never shown after the company or the date changes.
|--------------------------------------------------------------------------
*/

const EMPTY = [];

const useDailyAttendance = (companyCode, date = getDateKey()) => {

  const [state, setState] = useState({
    key: "",
    attendance: EMPTY,
    error: "",
  });

  const enabled = Boolean(companyCode && date);

  const key = `${companyCode}|${date}`;

  const isCurrent = state.key === key;

  useEffect(() => {

    if (!enabled) return undefined;

    const unsubscribe = subscribeToDailyAttendance(
      companyCode,
      date,
      (records) => {
        setState({ key, attendance: records, error: "" });
      },
      // Without this the subscription fails silently and loading never ends.
      (subscriptionError) => {

        console.error("Failed to load attendance:", subscriptionError);

        setState({
          key,
          attendance: EMPTY,
          error:
            subscriptionError.message || "Failed to load attendance.",
        });

      }
    );

    return () => unsubscribe();

  }, [companyCode, date, enabled, key]);

  /*
  | Manual attendance entry by HR. The realtime subscription above delivers the
  | new record, so nothing has to be merged into state here.
  */
  const markAttendance = useCallback(
    (record, approvedBy = "") =>
      saveAttendance(companyCode, record, approvedBy),
    [companyCode]
  );

  /*
  | Daily approval. Each takes the record itself rather than an id: the date
  | and the employee are what locate a day, and the row that was clicked
  | already carries both.
  |
  | Like the entry above, none of them touch state - the subscription is what
  | reports the decision back, so the row updates for everybody watching the
  | day and not only for the person who pressed the button.
  */

  const approveAttendance = useCallback(
    (record, approvedBy) =>
      setAttendanceApproval(companyCode, {
        date: record?.date,
        employeeId: record?.employeeId,
        status: APPROVAL_STATUS.APPROVED,
        approvedBy,
      }),
    [companyCode]
  );

  const rejectAttendance = useCallback(
    (record, approvedBy, remarks) =>
      setAttendanceApproval(companyCode, {
        date: record?.date,
        employeeId: record?.employeeId,
        status: APPROVAL_STATUS.REJECTED,
        approvedBy,
        remarks,
      }),
    [companyCode]
  );

  const approveDay = useCallback(
    (employeeIds, approvedBy) =>
      approveAttendanceDay(companyCode, date, employeeIds, approvedBy),
    [companyCode, date]
  );

  return {
    attendance: isCurrent ? state.attendance : EMPTY,
    loading: enabled && !isCurrent,
    error: isCurrent ? state.error : "",
    markAttendance,
    approveAttendance,
    rejectAttendance,
    approveDay,
  };

};

export default useDailyAttendance;
