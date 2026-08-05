import { db } from "../../firebase/firebase";
import {
  ref,
  get,
  set,
  update,
  onValue,
  query,
  orderByKey,
  startAt,
  endAt,
} from "firebase/database";
import {
  getDateKey,
  getMonthPrefix,
  formatTime,
} from "../../utils/attendance/attendanceDate";
import {
  calculateWorkingHours,
  resolvePunchInStatus,
} from "../../utils/attendance/attendanceUtils";
import { ATTENDANCE_STATUS } from "../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Service
|--------------------------------------------------------------------------
| The only place that talks to the attendance branch of the database.
|
| A record stores the minimum a day of attendance needs. Employee details are
| never copied here: they are resolved from
| `companies/{companyCode}/employees/{employeeId}` whenever a name, department
| or designation has to be shown.
|
| companies/{companyCode}/attendance/records/{YYYY-MM-DD}/{employeeId}
|--------------------------------------------------------------------------
*/

const recordsPath = (companyCode) =>
  `companies/${companyCode}/attendance/records`;

const recordPath = (companyCode, date, employeeId) =>
  `${recordsPath(companyCode)}/${date}/${employeeId}`;

/*
| Firebase rejects `undefined`, so every field is written explicitly.
*/

const buildAttendanceRecord = ({
  employeeId,
  date,
  punchIn = null,
  punchOut = null,
  status,
  remarks = "",
}) => ({

  employeeId,

  date,

  punchIn,
  punchInTime: punchIn ? formatTime(punchIn) : "",

  punchOut,
  punchOutTime: punchOut ? formatTime(punchOut) : "",

  workingHours: calculateWorkingHours(punchIn, punchOut),

  status:
    status ||
    (punchIn ? resolvePunchInStatus(punchIn) : ""),

  remarks,

  createdAt: Date.now(),

});

/*
|--------------------------------------------------------------------------
| Reads
|--------------------------------------------------------------------------
*/

/*
| Every record of a single month as `{ [date]: { [employeeId]: record } }`.
|
| Date keys are ordered, so the month is selected with a key range instead of
| downloading the whole records tree. `\uf8ff` is the highest code point
| Firebase orders on and makes the range cover every day of the prefix.
*/

const MONTH_RANGE_END = "\uf8ff";

const monthQuery = (companyCode, year, month) => {

  const prefix = getMonthPrefix(year, month);

  return query(
    ref(db, recordsPath(companyCode)),
    orderByKey(),
    startAt(prefix),
    endAt(`${prefix}${MONTH_RANGE_END}`)
  );

};

export const getMonthlyAttendanceRecords = async (
  companyCode,
  year,
  month
) => {

  const snapshot = await get(
    monthQuery(companyCode, year, month)
  );

  return snapshot.exists() ? snapshot.val() : {};

};

/*
|--------------------------------------------------------------------------
| Subscriptions
|--------------------------------------------------------------------------
| Each returns its unsubscribe function. The error callback is always passed
| through: without it a failing subscription is silent and the caller stays
| stuck on loading.
*/

export const subscribeToDailyAttendance = (
  companyCode,
  date,
  onData,
  onError
) =>
  onValue(
    ref(db, `${recordsPath(companyCode)}/${date}`),
    (snapshot) => {
      onData(
        snapshot.exists() ? Object.values(snapshot.val()) : []
      );
    },
    onError
  );

export const subscribeToEmployeeDay = (
  companyCode,
  employeeId,
  date,
  onData,
  onError
) =>
  onValue(
    ref(db, recordPath(companyCode, date, employeeId)),
    (snapshot) => {
      onData(snapshot.exists() ? snapshot.val() : null);
    },
    onError
  );

/*
| One employee's records for a single month, sorted by date.
*/

export const subscribeToEmployeeAttendanceHistory = (
  companyCode,
  employeeId,
  year,
  month,
  onData,
  onError
) =>
  onValue(
    monthQuery(companyCode, year, month),
    (snapshot) => {

      const history = [];

      if (snapshot.exists()) {

        Object.values(snapshot.val()).forEach((employees) => {

          if (employees?.[employeeId]) {
            history.push(employees[employeeId]);
          }

        });

      }

      history.sort((a, b) => a.date.localeCompare(b.date));

      onData(history);

    },
    onError
  );

/*
|--------------------------------------------------------------------------
| Punch In
|--------------------------------------------------------------------------
*/

export const punchInEmployee = async (
  companyCode,
  employeeId
) => {

  if (!employeeId) {
    return {
      success: false,
      message: "Employee account not found.",
    };
  }

  const today = getDateKey();

  const attendanceRef = ref(
    db,
    recordPath(companyCode, today, employeeId)
  );

  const snapshot = await get(attendanceRef);

  if (snapshot.exists()) {
    return {
      success: false,
      message: "Attendance already marked.",
    };
  }

  const attendance = buildAttendanceRecord({
    employeeId,
    date: today,
    punchIn: Date.now(),
  });

  await set(attendanceRef, attendance);

  return {
    success: true,
    data: attendance,
  };

};

/*
|--------------------------------------------------------------------------
| Punch Out
|--------------------------------------------------------------------------
*/

export const punchOutEmployee = async (
  companyCode,
  employeeId
) => {

  const attendanceRef = ref(
    db,
    recordPath(companyCode, getDateKey(), employeeId)
  );

  const snapshot = await get(attendanceRef);

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Punch in first.",
    };
  }

  const attendance = snapshot.val();

  if (attendance.punchOut) {
    return {
      success: false,
      message: "Already punched out.",
    };
  }

  const punchOut = Date.now();

  await update(attendanceRef, {
    punchOut,
    punchOutTime: formatTime(punchOut),
    workingHours: calculateWorkingHours(
      attendance.punchIn,
      punchOut
    ),
  });

  return { success: true };

};

/*
|--------------------------------------------------------------------------
| Manual Attendance (HR / Admin)
|--------------------------------------------------------------------------
| HR has the final say on a day of attendance, so an existing record is
| replaced instead of rejected: that is how an employee who punched in is
| later marked Half Day, Absent or On Leave.
|
| The original `createdAt` is kept, so the day still reports when it was
| first recorded.
*/

export const saveAttendance = async (
  companyCode,
  attendance
) => {

  const attendanceRef = ref(
    db,
    recordPath(companyCode, attendance.date, attendance.employeeId)
  );

  const snapshot = await get(attendanceRef);

  const existing = snapshot.exists() ? snapshot.val() : null;

  const record = buildAttendanceRecord(attendance);

  await set(
    attendanceRef,
    existing
      ? { ...record, createdAt: existing.createdAt || record.createdAt }
      : record
  );

  return {
    success: true,
    updated: Boolean(existing),
  };

};

/*
|--------------------------------------------------------------------------
| Apply Attendance Changes
|--------------------------------------------------------------------------
| Used when an attendance request is approved.
|
| Approving a punch in correction regularises the day: the punch in has been
| accepted by HR, so the day counts as Present and the Late flag it was given
| at punch in time is cleared. A punch out only correction leaves the status
| alone, because it says nothing about when the employee arrived.
*/

export const updateAttendanceRecord = async (
  companyCode,
  request
) => {

  const attendanceRef = ref(
    db,
    recordPath(companyCode, request.date, request.employeeId)
  );

  const snapshot = await get(attendanceRef);

  /*
  | No record for that day usually means the employee never punched in, which
  | is exactly what a correction request is for. Build the record from the
  | request instead of failing, as long as it carries a punch in time.
  */
  if (!snapshot.exists()) {

    if (!request.requestedPunchIn) {

      return {
        success: false,
        message:
          "Attendance record not found. A punch in time is required to create one.",
      };

    }

    await set(
      attendanceRef,
      buildAttendanceRecord({
        employeeId: request.employeeId,
        date: request.date,
        punchIn: request.requestedPunchIn,
        punchOut: request.requestedPunchOut || null,
        status: ATTENDANCE_STATUS.PRESENT,
        remarks: request.reason || "",
      })
    );

    return { success: true };

  }

  const attendance = snapshot.val();

  const updates = {};

  if (request.requestedPunchIn) {
    updates.punchIn = request.requestedPunchIn;
    updates.punchInTime = formatTime(request.requestedPunchIn);
    updates.status = ATTENDANCE_STATUS.PRESENT;
  }

  if (request.requestedPunchOut) {
    updates.punchOut = request.requestedPunchOut;
    updates.punchOutTime = formatTime(request.requestedPunchOut);
  }

  const punchIn = updates.punchIn ?? attendance.punchIn;

  const punchOut = updates.punchOut ?? attendance.punchOut;

  updates.workingHours = calculateWorkingHours(punchIn, punchOut);

  await update(attendanceRef, updates);

  return { success: true };

};
