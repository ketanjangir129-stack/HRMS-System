import { useCallback, useEffect, useState } from "react";
import {
  saveAttendance,
  subscribeToDailyAttendance,
} from "../services/attendanceServices/attendanceService";
import { getDateKey } from "../utils/attendance/attendanceDate";

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
    (record) => saveAttendance(companyCode, record),
    [companyCode]
  );

  return {
    attendance: isCurrent ? state.attendance : EMPTY,
    loading: enabled && !isCurrent,
    error: isCurrent ? state.error : "",
    markAttendance,
  };

};

export default useDailyAttendance;
