import { db } from "../../firebase/firebase";
import {
  ref,
  get,
  set,
  update,
  onValue,
} from "firebase/database";
import {
  getDateKey,
  getMonthPath,
  getMonthNode,
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
| companies/{companyCode}/attendance/records/{year}/{Month}/{YYYY-MM-DD}/{employeeId}
|
| The year and the month a day belongs to are nodes of their own, so a month
| of attendance is one read of one node. Neither is ever stored on a record:
| they are the nodes the record lives in, and deriving them from the date is
| the only way they can never disagree.
|
| The day itself stays a full `YYYY-MM-DD` key rather than a day number, so a
| month reads back as `{ [date]: { [employeeId]: record } }` and every report
| that looks a day up by its date key keeps working unchanged.
|--------------------------------------------------------------------------
*/

const recordsPath = (companyCode) =>
  `companies/${companyCode}/attendance/records`;

/*
| The path of one day, relative to the records root. Every write below goes
| through here, so the month node is decided in exactly one place.
*/

const dayPath = (date, employeeId) =>
  `${getMonthPath(date)}/${date}/${employeeId}`;

const recordPath = (companyCode, date, employeeId) =>
  `${recordsPath(companyCode)}/${dayPath(date, employeeId)}`;

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
| A month is a node, so it is read directly. This used to be a key range over
| the whole records tree, which had to be ordered and filtered by Firebase on
| every read; now the month is simply fetched.
*/

const monthRef = (companyCode, year, month) =>
  ref(
    db,
    `${recordsPath(companyCode)}/${getMonthNode(year, month)}`
  );

export const getMonthlyAttendanceRecords = async (
  companyCode,
  year,
  month
) => {

  const snapshot = await get(
    monthRef(companyCode, year, month)
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
    ref(
      db,
      `${recordsPath(companyCode)}/${getMonthPath(date)}/${date}`
    ),
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
    monthRef(companyCode, year, month),
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
  employeeId,
  location = null
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

    const existing = snapshot.val();

    /*
    | An approved leave is written into attendance the moment it is approved,
    | so the day already has a record. Reporting it as "already marked" would
    | read as though the employee had punched in, which is the opposite of
    | what happened.
    */

    if (existing.status === ATTENDANCE_STATUS.LEAVE) {
      return {
        success: false,
        message: "You are on approved leave today.",
      };
    }

    /*
    | Half a day of leave still leaves half a day of work, so the punch is
    | merged into the record the approval created instead of being refused.
    |
    | The status stays Half Day: the session that was taken off does not come
    | back because the other half was worked.
    */

    const isUnpunchedHalfDayLeave =
      existing.status === ATTENDANCE_STATUS.HALF_DAY &&
      existing.leaveRequestId &&
      !existing.punchIn;

    if (isUnpunchedHalfDayLeave) {

      const punchIn = Date.now();

      const updates = {
        punchIn,
        punchInTime: formatTime(punchIn),
      };

      if (location) {
        updates["location/punchIn"] = location;
      }

      await update(attendanceRef, updates);

      return {
        success: true,
        data: { ...existing, ...updates },
      };

    }

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

  const record = location
    ? { ...attendance, location: { punchIn: location } }
    : attendance;

  await set(attendanceRef, record);

  return {
    success: true,
    data: record,
  };

};

/*
|--------------------------------------------------------------------------
| Punch Out
|--------------------------------------------------------------------------
*/

export const punchOutEmployee = async (
  companyCode,
  employeeId,
  location = null
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

  /*
  | A record without a punch in is a day booked by leave, not a day that was
  | started. Punching out of it would stamp a leave day with a time and no
  | hours to go with it.
  */

  if (!attendance.punchIn) {
    return {
      success: false,
      message: "Punch in first.",
    };
  }

  if (attendance.punchOut) {
    return {
      success: false,
      message: "Already punched out.",
    };
  }

  const punchOut = Date.now();

  const updates = {
    punchOut,
    punchOutTime: formatTime(punchOut),
    workingHours: calculateWorkingHours(
      attendance.punchIn,
      punchOut
    ),
  };

  if (location) {
    updates["location/punchOut"] = location;
  }

  await update(attendanceRef, updates);

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
      ? {
          ...record,
          createdAt: existing.createdAt || record.createdAt,
          ...(existing.location ? { location: existing.location } : {}),
        }
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

/*
|--------------------------------------------------------------------------
| Leave Synchronisation
|--------------------------------------------------------------------------
| Approved leave has to appear on the attendance sheet, otherwise a day
| somebody was granted off is reported as an absence: the daily list, the
| monthly report, the calendar and the present rate all read the record, and a
| day with no record counts as Absent.
|
| The leave module owns the decision and calls in here, because this file is
| the only place that writes to the attendance branch.
|
| Two fields tie a record back to the leave that created it:
|
|   leaveRequestId    which request booked the day, so a day can be given
|                     back later without touching days it did not book
|   leaveStatusBefore what the day was before the leave was written over it,
|                     so releasing it restores the day instead of guessing
|
| Both are only ever set here. A record written by a punch does not carry
| them, which is exactly how a normal day is told apart from a booked one.
|--------------------------------------------------------------------------
*/

const readEmployeeDays = (companyCode, employeeId, dateKeys) =>
  Promise.all(
    dateKeys.map((date) =>
      get(ref(db, recordPath(companyCode, date, employeeId)))
    )
  );

/*
| Every path is written in one multi location update, so a range either lands
| completely or not at all and a half written leave can never be left behind.
*/

const writeDays = async (companyCode, updates) => {

  const days = Object.keys(updates).length;

  if (days > 0) {
    await update(ref(db, recordsPath(companyCode)), updates);
  }

  return { success: true, days };

};

/*
|--------------------------------------------------------------------------
| Book Leave Into Attendance
|--------------------------------------------------------------------------
| Called when a leave request is approved.
|
| Punch times already on the day are kept. A leave approved after the fact
| still records that the employee was there, and throwing that away would
| leave the day with no evidence of when they arrived.
*/

export const applyLeaveAttendance = async (
  companyCode,
  {
    employeeId,
    dateKeys = [],
    status,
    remarks = "",
    leaveRequestId = "",
  }
) => {

  if (!employeeId || !dateKeys.length || !status) {
    return {
      success: false,
      message: "This leave has no days to record.",
    };
  }

  const snapshots = await readEmployeeDays(
    companyCode,
    employeeId,
    dateKeys
  );

  const updates = {};

  dateKeys.forEach((date, index) => {

    const snapshot = snapshots[index];

    const current = snapshot.exists() ? snapshot.val() : null;

    /*
    | A day this same request already booked is left untouched. Writing it
    | again would record the leave status as the status to go back to, and
    | releasing the leave would then restore the leave.
    */

    if (current?.leaveRequestId === leaveRequestId) return;

    updates[dayPath(date, employeeId)] = {

      ...buildAttendanceRecord({
        employeeId,
        date,
        punchIn: current?.punchIn || null,
        punchOut: current?.punchOut || null,
        status,
        remarks,
      }),

      createdAt: current?.createdAt || Date.now(),

      ...(current?.location ? { location: current.location } : {}),

      leaveRequestId,

      leaveStatusBefore: current?.status || "",

    };

  });

  return writeDays(companyCode, updates);

};

/*
|--------------------------------------------------------------------------
| Release Leave From Attendance
|--------------------------------------------------------------------------
| Called when an approved leave request is deleted.
|
| Only the days carrying this request's id are given back. A day HR has since
| marked by hand has lost the link, and is left exactly as HR left it.
*/

export const clearLeaveAttendance = async (
  companyCode,
  {
    employeeId,
    dateKeys = [],
    leaveRequestId = "",
  }
) => {

  if (!employeeId || !dateKeys.length || !leaveRequestId) {
    return { success: true, days: 0 };
  }

  const snapshots = await readEmployeeDays(
    companyCode,
    employeeId,
    dateKeys
  );

  const updates = {};

  dateKeys.forEach((date, index) => {

    const snapshot = snapshots[index];

    const current = snapshot.exists() ? snapshot.val() : null;

    if (current?.leaveRequestId !== leaveRequestId) return;

    const path = dayPath(date, employeeId);

    /*
    | A day with a punch in was a real day of attendance before the leave was
    | written over it, so it is rebuilt from its punch times and handed back
    | its previous status.
    |
    | Rebuilding rather than patching is what drops the two leave fields: they
    | are not part of a record, so an unlinked day carries no trace of the
    | request that has just been deleted.
    */

    if (current.punchIn) {

      updates[path] = {

        ...buildAttendanceRecord({
          employeeId,
          date,
          punchIn: current.punchIn,
          punchOut: current.punchOut || null,
          /*
          | An empty status makes the builder derive it from the punch in
          | again, which covers a day that had no status to begin with.
          */
          status: current.leaveStatusBefore || "",
          remarks: "",
        }),

        createdAt: current.createdAt || Date.now(),

        ...(current.location ? { location: current.location } : {}),

      };

      return;

    }

    // The day only ever existed because of the leave, so it goes with it.
    updates[path] = null;

  });

  return writeDays(companyCode, updates);

};
