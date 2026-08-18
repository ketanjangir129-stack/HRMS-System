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
  getApprovalStatus,
  resolvePunchInStatus,
} from "../../utils/attendance/attendanceUtils";
import {
  APPROVAL_STATUS,
  ATTENDANCE_STATUS,
} from "../../utils/attendance/attendanceConstants";

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
|--------------------------------------------------------------------------
| Daily Approval
|--------------------------------------------------------------------------
| The four fields that carry HR's sign off on a day. They live on the record
| itself rather than in a branch of their own, so a day and its approval can
| never disagree and every read that already loads the record already has the
| decision with it.
|
| Which state a record is born in depends on who wrote it. Only a punch is
| self reported: the other three writers are HR marking a day by hand, an
| approver applying a correction, and the leave module booking a leave that
| was already granted, and all three were decided by somebody entitled to
| decide. Sending those back round for a second approval would bury the
| handful of days that genuinely need looking at.
|
|   punchInEmployee        Pending     the employee says they were here
|   saveAttendance         Approved    HR wrote the day itself
|   updateAttendanceRecord Approved    an approver accepted the correction
|   applyLeaveAttendance   Approved    the leave request was approved
|
| A pending record carries no approver and no timestamp: nobody has decided
| yet, and writing a name against a decision that has not been made is how a
| record ends up saying it was approved by whoever last touched it.
*/

const buildApproval = ({
  status = APPROVAL_STATUS.PENDING,
  by = "",
  remarks = "",
} = {}) => {

  const decided = status !== APPROVAL_STATUS.PENDING;

  return {
    approvalStatus: status,
    approvedBy: decided ? by : "",
    approvedAt: decided ? Date.now() : null,
    approvalRemarks: remarks,
  };

};

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
  approval,
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

  ...buildApproval(approval),

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

      /*
      | The day was approved as a half day of leave, and a punch has just been
      | added to it that nobody has seen. The half that was worked is exactly
      | the part that needs reviewing, so the day goes back into the queue
      | rather than keeping the sign off it was given for the leave alone.
      */

      const updates = {
        punchIn,
        punchInTime: formatTime(punchIn),
        ...buildApproval(),
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
|
| Marking a day by hand is itself the approval: only HR and the owner can open
| the form, so the decision has been made by the time it is saved and asking
| them to approve their own entry afterwards would be asking twice. The
| previous approval is deliberately not carried over - this is a new decision
| about a day that has just changed, signed by whoever made it.
*/

export const saveAttendance = async (
  companyCode,
  attendance,
  approvedBy = ""
) => {

  const attendanceRef = ref(
    db,
    recordPath(companyCode, attendance.date, attendance.employeeId)
  );

  const snapshot = await get(attendanceRef);

  const existing = snapshot.exists() ? snapshot.val() : null;

  const record = buildAttendanceRecord({
    ...attendance,
    approval: {
      status: APPROVAL_STATUS.APPROVED,
      by: approvedBy,
    },
  });

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
|
| The day is signed off at the same time, by the approver who accepted the
| correction. They have just decided this is what the day was, so leaving it
| Pending would ask them the same question twice - and on a day that had
| already been approved, saying nothing would let the punch times change
| underneath a sign off that was given for different ones.
*/

export const updateAttendanceRecord = async (
  companyCode,
  request,
  approvedBy = ""
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
        approval: {
          status: APPROVAL_STATUS.APPROVED,
          by: approvedBy,
        },
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

  Object.assign(
    updates,
    buildApproval({
      status: APPROVAL_STATUS.APPROVED,
      by: approvedBy,
    })
  );

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
    approvedBy = "",
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
        /*
        | The leave request this day comes from has already been approved, so
        | the day it books is approved with it. Queueing it would ask for a
        | second decision on a day whose decision is the reason it exists.
        */
        approval: {
          status: APPROVAL_STATUS.APPROVED,
          by: approvedBy,
        },
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
          /*
          | Back to a plain punched day, so back to Pending like any other.
          | The approval it is losing was the one the leave gave it, and that
          | leave has just been deleted; what is left is a punch in nobody has
          | reviewed on its own terms.
          */
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

/*
|--------------------------------------------------------------------------
| Daily Approval
|--------------------------------------------------------------------------
| HR and the owner sign off the days their employees recorded themselves.
| Only the four approval fields are ever written here: the punch times, the
| status and the hours are what is being reviewed, so approving a day must
| not be able to change what the day says.
|
| A decision can be revisited. Unlike a correction request, which is answered
| once and closed, a day of attendance is a standing record: HR can approve a
| day in the morning, find out at lunch that the employee never came in, and
| reject it. Only a decision that would not change anything is refused.
|--------------------------------------------------------------------------
*/

const readDay = (companyCode, date, employeeId) =>
  get(ref(db, recordPath(companyCode, date, employeeId)));

export const setAttendanceApproval = async (
  companyCode,
  {
    date,
    employeeId,
    status,
    approvedBy = "",
    remarks = "",
  }
) => {

  /*
  | Both are part of the path. A missing one would build a path pointing at
  | the whole day, or at the records root, and the approval would then be
  | written over every employee on it. The month comes from the date, so a
  | date that is not a real key fails the same check.
  */

  if (!getMonthPath(date) || !employeeId) {
    return {
      success: false,
      message: "Attendance record not found.",
    };
  }

  if (
    status !== APPROVAL_STATUS.APPROVED &&
    status !== APPROVAL_STATUS.REJECTED
  ) {
    return {
      success: false,
      message: "A day of attendance can only be approved or rejected.",
    };
  }

  /*
  | Rejecting takes a day of attendance away from somebody, so it says why.
  | The employee reads the remark and knows what to raise a correction about.
  */

  if (
    status === APPROVAL_STATUS.REJECTED &&
    !remarks.trim()
  ) {
    return {
      success: false,
      message: "Remarks are required to reject a day of attendance.",
    };
  }

  const snapshot = await readDay(companyCode, date, employeeId);

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Attendance record not found.",
    };
  }

  /*
  | The list this was pressed from is realtime, so the day can have been
  | decided by somebody else between the moment the row was rendered and the
  | moment the button was pressed.
  */

  if (getApprovalStatus(snapshot.val()) === status) {
    return {
      success: false,
      message: `This day has already been ${status.toLowerCase()}.`,
    };
  }

  await update(
    ref(db, recordPath(companyCode, date, employeeId)),
    buildApproval({
      status,
      by: approvedBy,
      remarks: remarks.trim(),
    })
  );

  return { success: true };

};

/*
|--------------------------------------------------------------------------
| Approve A Whole Day
|--------------------------------------------------------------------------
| Signing off a morning one row at a time is how a feature like this stops
| being used by the second week, so the whole day goes in one action.
|
| Only the days that are actually pending are touched. A day already approved
| is left alone, and a day that was rejected is not quietly reinstated by
| somebody clearing the queue: undoing a rejection is a decision of its own
| and goes through the single record path above.
|
| Every path is written in one multi location update, so the day either lands
| completely or not at all.
|--------------------------------------------------------------------------
*/

export const approveAttendanceDay = async (
  companyCode,
  date,
  employeeIds = [],
  approvedBy = ""
) => {

  if (!getMonthPath(date) || employeeIds.length === 0) {
    return { success: true, approved: 0 };
  }

  const snapshots = await Promise.all(
    employeeIds.map((employeeId) =>
      readDay(companyCode, date, employeeId)
    )
  );

  const approval = buildApproval({
    status: APPROVAL_STATUS.APPROVED,
    by: approvedBy,
  });

  const updates = {};

  let approved = 0;

  employeeIds.forEach((employeeId, index) => {

    const snapshot = snapshots[index];

    if (!snapshot.exists()) return;

    if (
      getApprovalStatus(snapshot.val()) !== APPROVAL_STATUS.PENDING
    ) {
      return;
    }

    const path = dayPath(date, employeeId);

    /*
    | Field by field rather than the whole record: a multi location update
    | replaces whatever sits at each path it is given, so writing the record
    | would overwrite punch times that may have moved since it was read.
    */

    Object.entries(approval).forEach(([field, value]) => {
      updates[`${path}/${field}`] = value;
    });

    approved++;

  });

  if (approved > 0) {
    await update(ref(db, recordsPath(companyCode)), updates);
  }

  return { success: true, approved };

};
