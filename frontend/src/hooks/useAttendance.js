import { useCallback, useEffect, useState } from "react";
import {
  punchInEmployee,
  punchOutEmployee,
  retakePunchPhoto,
  subscribeToEmployeeDayFields,
} from "../services/attendanceServices/attendanceService";
import { getAttendanceDateKey } from "../utils/attendance/attendanceDate";
import { getPunchLocation } from "../utils/attendance/attendanceLocation";
import { getCurrentEmployeeId } from "../utils/attendance/attendanceRequestUtils";

/*
|--------------------------------------------------------------------------
| My Attendance
|--------------------------------------------------------------------------
| The signed in employee's day, plus their punch and photo-retake actions.
| Only the fields in CARD_FIELDS are subscribed to - the record's location,
| approval and audit data are never downloaded - and the card stays in sync
| the moment a punch is written.
|
| Loading is derived from which request has been delivered, so it resets on
| its own without setting state from inside the effect body.
|--------------------------------------------------------------------------
*/

export const PUNCH_TYPE = Object.freeze({
  IN: "in",
  OUT: "out",
});

// Exactly what the punch card renders.
const CARD_FIELDS = Object.freeze([
  "punchIn",
  "punchOut",
  "punchInTime",
  "punchOutTime",
  "status",
  "images/punchIn/url",
  "images/punchOut/url",
]);

const PUNCH_LABEL = {
  [PUNCH_TYPE.IN]: "punch in",
  [PUNCH_TYPE.OUT]: "punch out",
};

const useAttendance = (companyCode, currentUser) => {

  const employeeId = getCurrentEmployeeId(currentUser);

  const [state, setState] = useState({
    key: "",
    attendance: null,
    error: "",
  });

  const enabled = Boolean(companyCode && employeeId);
  const dateKey = getAttendanceDateKey();
  const key = `${companyCode}|${employeeId}|${dateKey}`;

  const isCurrent = state.key === key;
  const attendance = isCurrent ? state.attendance : null;

  useEffect(() => {

    if (!enabled) return undefined;

    const unsubscribe = subscribeToEmployeeDayFields(
      companyCode,
      employeeId,
      dateKey,
      CARD_FIELDS,
      (record) => setState({ key, attendance: record, error: "" }),
      // Without this the subscription fails silently and loading never ends.
      (subscriptionError) => {
        console.error("Failed to load attendance:", subscriptionError);
        setState({
          key,
          attendance: null,
          error: subscriptionError.message || "Failed to load attendance.",
        });
      }
    );

    return () => unsubscribe();

  }, [companyCode, employeeId, enabled, key, dateKey]);

  /*
  | `location` may be a value or a promise. The card starts the GPS lookup the
  | moment the camera opens, so by the time the photo is confirmed the fix is
  | usually ready and the punch is not held up by it.
  */
  const punch = useCallback(
    async (type, image, location) => {

      if (type !== PUNCH_TYPE.IN && type !== PUNCH_TYPE.OUT) {
        return { success: false, message: "Unknown attendance action." };
      }

      if (!image) {
        return { success: false, message: "Please capture an attendance photo." };
      }

      const position = await (location ?? getPunchLocation());

      if (!position) {
        return {
          success: false,
          message: `Location permission is required to ${PUNCH_LABEL[type]}.`,
        };
      }

      return type === PUNCH_TYPE.IN
        ? punchInEmployee(companyCode, employeeId, position, image)
        : punchOutEmployee(companyCode, employeeId, position, dateKey, image);

    },
    [companyCode, employeeId, dateKey]
  );

  // Swap the photo of a punch already made today. No GPS needed.
  const retakePhoto = useCallback(
    (type, image) => retakePunchPhoto(employeeId, type, image),
    [employeeId]
  );

  return {
    attendance,
    loading: enabled && !isCurrent,
    error: isCurrent ? state.error : "",
    employeeId,
    punch,
    retakePhoto,
  };

};

export default useAttendance;
