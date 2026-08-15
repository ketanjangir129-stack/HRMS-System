import { useCallback, useEffect, useState } from "react";
import {
  punchInEmployee,
  punchOutEmployee,
  subscribeToEmployeeDay,
} from "../services/attendanceServices/attendanceService";
import { getDateKey } from "../utils/attendance/attendanceDate";
import { getPunchLocation } from "../utils/attendance/attendanceLocation";
import { getCurrentEmployeeId } from "../utils/attendance/attendanceRequestUtils";

/*
|--------------------------------------------------------------------------
| My Attendance
|--------------------------------------------------------------------------
| The signed in employee's record for today, plus their punch actions. The
| subscription keeps the card in sync the moment a punch is written.
|
| Loading is derived from which request has been delivered, so it resets on
| its own without setting state from inside the effect body.
|--------------------------------------------------------------------------
*/

const useAttendance = (companyCode, currentUser) => {

  const employeeId = getCurrentEmployeeId(currentUser);

  const [state, setState] = useState({
    key: "",
    attendance: null,
    error: "",
  });

  const enabled = Boolean(companyCode && employeeId);

  const key = `${companyCode}|${employeeId}`;

  const isCurrent = state.key === key;

  useEffect(() => {

    if (!enabled) return undefined;

    const unsubscribe = subscribeToEmployeeDay(
      companyCode,
      employeeId,
      getDateKey(),
      (record) => {
        setState({ key, attendance: record, error: "" });
      },
      // Without this the subscription fails silently and loading never ends.
      (subscriptionError) => {

        console.error("Failed to load attendance:", subscriptionError);

        setState({
          key,
          attendance: null,
          error:
            subscriptionError.message || "Failed to load attendance.",
        });

      }
    );

    return () => unsubscribe();

  }, [companyCode, employeeId, enabled, key]);

  const punchIn = useCallback(
    async () => {

      const location = await getPunchLocation();

      /*
      | The punch is not attempted without a position, so a denied prompt
      | leaves the day untouched rather than recording a punch nobody can
      | place.
      */

      if (!location) {
        return {
          success: false,
          message: "Location permission is required to punch in.",
        };
      }

      return punchInEmployee(companyCode, employeeId, location);

    },
    [companyCode, employeeId]
  );

  const punchOut = useCallback(
    async () => {

      const location = await getPunchLocation();

      if (!location) {
        return {
          success: false,
          message: "Location permission is required to punch out.",
        };
      }

      return punchOutEmployee(companyCode, employeeId, location);

    },
    [companyCode, employeeId]
  );

  return {
    attendance: isCurrent ? state.attendance : null,
    loading: enabled && !isCurrent,
    error: isCurrent ? state.error : "",
    employeeId,
    punchIn,
    punchOut,
  };

};

export default useAttendance;
