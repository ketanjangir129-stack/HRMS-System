import { db } from "../../firebase/firebase";
import {
  ref,
  get,
  set,
  push,
  update,
  remove,
  runTransaction,
} from "firebase/database";
import { LEAVE_STATUS } from "../../utils/leave/leaveConstants";
import {
  getLeaveAttendanceRemarks,
  getLeaveAttendanceStatus,
  getLeaveDateKeys,
  getLeaveRequestYear,
  getLeaveWorkingDateKeys,
  parseLeaveDate,
} from "../../utils/leave/leaveUtils";
import {
  applyLeaveAttendance,
  clearLeaveAttendance,
} from "../attendanceServices/attendanceService";
import { getHolidaysForYears } from "../holidayServices/holidayService";
import { getHolidayDates } from "../../utils/holiday/holidayUtils";
import {
  getDateKey,
  getMonthPath,
} from "../../utils/attendance/attendanceDate";
import {
    notifyLeaveApprovers,
    notifyLeaveApproved,
    notifyLeaveRejected,
} from "../notifications/leaveNotificationService";


const DEFAULT_SETTINGS = {
  annualLeaves: 12,
  monthlyAccrual: 1,
  allowCarryForward: true,
  maxCarryForward: 5,
};

/*
|--------------------------------------------------------------------------
| Where A Request Lives
|--------------------------------------------------------------------------
| companies/{companyCode}/leave/requests/{year}/{Month}/{appliedDate}/{employeeId}/{requestId}
|
| Keyed the way an attendance record is: a year, a month, a date, then the
| employee. The date here is the day the request was raised, not the days it
| asks for, because a request can span a range and only one node holds it.
|
| The request id is the last step of the address. Without it the employee and
| the day of applying were the whole key, so a second application raised on
| the same day overwrote the first one whatever its state: an approved leave
| would vanish from the history while the days it booked stayed spent on the
| balance and stayed written on the attendance sheet under an id no surviving
| request carried, which left them impossible to release.
|
| `appliedDate` is stored on the request as well as being part of its key.
| Deriving it from `requestedAt` on every read would rebuild the key from a
| timestamp in whatever timezone the reader happens to be in, and a request
| raised late in the evening would then be looked for under the wrong day.
|
| The year and month are not stored: they are the nodes the request lives in,
| and deriving them from `appliedDate` is the only way they can never
| disagree.
|
| Requests written before the id was part of the address sit one level higher,
| directly under the employee. They are still read and still decided, so the
| tree needs no migration: `isRequestNode` tells a request written the old way
| apart from the map of requests written the new way.
*/

const requestsPath = (companyCode) =>
  `companies/${companyCode}/leave/requests`;

const employeeRequestsPath = (companyCode, appliedDate, employeeId) =>
  `${requestsPath(companyCode)}/${getMonthPath(appliedDate)}/${appliedDate}/${employeeId}`;

const requestPath = (companyCode, appliedDate, employeeId, requestId) =>
  `${employeeRequestsPath(companyCode, appliedDate, employeeId)}/${requestId}`;

/*
| A request itself, as opposed to the map of requests an employee raised on a
| day. Only a request carries its own fields; the map is keyed by request id
| and carries none of them.
*/

const isRequestNode = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  (
    "requestId" in value ||
    "employeeId" in value ||
    "fromDate" in value
  );

/*
| The address of a request. Requests written before this tree was keyed by
| date have no `appliedDate`, so it falls back to the day they were raised.
*/

const requestKeys = (request) => ({

  appliedDate:
    request?.appliedDate ||
    (request?.requestedAt ? getDateKey(request.requestedAt) : ""),

  employeeId: request?.employeeId,

  requestId: request?.requestId,

});

/*
| Where a request actually is, read back with it.
|
| The id is tried first and the node it used to live at second, so a request
| raised before the id joined the address is still found. The old address is
| the parent of the new one, so what is found there is only accepted if it is
| a request and not the map of requests now filed beneath it.
*/

const findRequestRef = async (
  companyCode,
  { appliedDate, employeeId, requestId }
) => {

  const paths = [];

  if (requestId) {
    paths.push(
      requestPath(companyCode, appliedDate, employeeId, requestId)
    );
  }

  paths.push(
    employeeRequestsPath(companyCode, appliedDate, employeeId)
  );

  for (const path of paths) {

    const nodeRef = ref(db, path);

    const snapshot = await get(nodeRef);

    if (snapshot.exists() && isRequestNode(snapshot.val())) {

      return {
        ref: nodeRef,
        value: snapshot.val(),
      };

    }

  }

  return null;

};

/*
| The id stays a field of the request rather than its key: nothing addresses a
| request by it any more, but it is what links an approved leave to the
| attendance days it booked, and that link has to stay unique per request.
|
| Push keys are generated from the timestamp plus a random component, so two
| people applying in the same millisecond cannot end up with the same id.
*/

const generateLeaveRequestId = (companyCode) => {

  const key = push(
    ref(
      db,
      requestsPath(companyCode)
    )
  ).key;

  return `REQ_${key}`;

};

/*
|--------------------------------------------------------------------------
| Leave Settings
|--------------------------------------------------------------------------
*/

export const getLeaveSettings = async (companyCode) => {
  const settingsRef = ref(
    db,
    `companies/${companyCode}/leave/settings`
  );

  const snapshot = await get(settingsRef);

  if (!snapshot.exists()) {
    await set(settingsRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  return snapshot.val();
};

export const updateLeaveSettings = async (
  companyCode,
  settings
) => {

  await update(
    ref(
      db,
      `companies/${companyCode}/leave/settings`
    ),
    settings
  );

  return {
    success: true,
  };

};

/*
|--------------------------------------------------------------------------
| Leave Usage
|--------------------------------------------------------------------------
*/

export const getLeaveUsage = async (
  companyCode,
  employeeId,
  year
) => {

  const usageRef = ref(
    db,
    `companies/${companyCode}/leave/usage/${year}/${employeeId}`
  );

  const snapshot = await get(usageRef);

  if (!snapshot.exists()) {

    return {
      used: 0,
      lwp: 0,
      carryForward: 0,
    };

  }

  return snapshot.val();

};

export const updateLeaveUsage = async (
  companyCode,
  employeeId,
  year,
  data
) => {

  await update(
    ref(
      db,
      `companies/${companyCode}/leave/usage/${year}/${employeeId}`
    ),
    data
  );

  return {
    success: true,
  };

};

/*
|--------------------------------------------------------------------------
| Consume / Release Leave Days
|--------------------------------------------------------------------------
| `used` is read and written by every approval, so it is moved through a
| transaction: two approvals running at the same time would otherwise both
| write "the value I read plus my days" and one of them would be lost.
|
| A negative total is clamped to zero so a release can never drive the used
| balance below what was actually taken.
*/

const changeLeaveUsage = async (
  companyCode,
  employeeId,
  year,
  days
) => {

  const usageRef = ref(
    db,
    `companies/${companyCode}/leave/usage/${year}/${employeeId}`
  );

  await runTransaction(usageRef, (current) => ({

    lwp: current?.lwp || 0,

    carryForward: current?.carryForward || 0,

    used: Math.max(
      0,
      (current?.used || 0) + days
    ),

  }));

};

/*
|--------------------------------------------------------------------------
| Attendance Payload
|--------------------------------------------------------------------------
| The days a request covers, described the way the attendance module expects
| them. Booking and releasing both build it from here, so a day can only be
| released under the same id it was booked with.
*/

const toAttendancePayload = (request, dateKeys) => ({

  employeeId: request?.employeeId,

  dateKeys: dateKeys || getLeaveDateKeys(request),

  leaveRequestId: request?.requestId,

});

/*
|--------------------------------------------------------------------------
| Holidays Of A Request
|--------------------------------------------------------------------------
| The declared holidays of every year the request touches, so a range that
| runs across new year is priced against both calendars.
|
| A failure here is swallowed on purpose: an unreachable holiday calendar
| must not block an approval. The worst case is that a holiday inside the
| range is written onto the attendance sheet as leave, which is what the
| module did before holidays existed and is repaired the next time the
| request is re-approved.
*/

const getRequestHolidayDates = async (companyCode, request) => {

  try {

    const years = [
      parseLeaveDate(request?.fromDate)?.getFullYear(),
      parseLeaveDate(request?.toDate)?.getFullYear(),
    ].filter(Boolean);

    if (!companyCode || years.length === 0) return [];

    return getHolidayDates(
      await getHolidaysForYears(companyCode, years)
    );

  } catch (error) {

    console.error("Failed to load holidays for leave request:", error);

    return [];

  }

};

/*
|--------------------------------------------------------------------------
| Create Leave Request
|--------------------------------------------------------------------------
*/

export const createLeaveRequest = async (
    companyCode,
    request
) => {

    try {

        const employeeId = request?.employeeId;

        /*
        | The employee is half the address now, so a request without one is
        | refused here instead of being written to a path that would overwrite
        | the whole day.
        */

        if (!employeeId) {
            return {
                success: false,
                message: "An employee is required to raise a leave request.",
            };
        }

        const requestId =
            generateLeaveRequestId(companyCode);

        const requestedAt = Date.now();

        const appliedDate = getDateKey(requestedAt);

        await set(

            ref(
                db,
                requestPath(
                    companyCode,
                    appliedDate,
                    employeeId,
                    requestId
                )
            ),

            {
                requestId,

                ...request,

                appliedDate,

                status: LEAVE_STATUS.PENDING,

                requestedAt,

                approvedBy: "",

                approvedAt: null,

                remarks: "",
            }

        );
        // Creating notifications
        try {
            await notifyLeaveApprovers(
                companyCode,
                request,
                requestId
            );
        } catch (notificationError) {
            console.error(
                "Leave application notification failed:",
                notificationError
            );
        }

        return {
            success: true,
            requestId,
        };

    } catch (error) {

        console.error(
            "Create Leave Request Error:",
            error
        );

        throw error;

    }

};
/*
|--------------------------------------------------------------------------
| Get Leave Requests
|--------------------------------------------------------------------------
| The year, month and date buckets are flattened away here: every page above
| works on a plain list of requests and none of them cares which node a
| request is filed under.
|
| The last bucket is the employee's requests for that day, which is a map of
| them keyed by id. A request raised before the id joined the address sits at
| that spot itself, so it is returned as it is found rather than being read
| for children it does not have.
*/

export const getLeaveRequests = async (
    companyCode
) => {

    try {

        const snapshot = await get(

            ref(
                db,
                requestsPath(companyCode)
            )

        );

        if (!snapshot.exists()) {
            return [];
        }

        return Object.values(
            snapshot.val()
        ).flatMap(
            (months) => Object.values(months || {}).flatMap(
                (dates) => Object.values(dates || {}).flatMap(
                    (employees) => Object.values(employees || {}).flatMap(
                        (employeeRequests) =>
                            isRequestNode(employeeRequests)
                                ? [employeeRequests]
                                : Object.values(employeeRequests || {})
                    )
                )
            )
        );

    } catch (error) {

        console.error(
            "Get Leave Requests Error:",
            error
        );

        throw error;

    }

};

/*
|--------------------------------------------------------------------------
| Approve Leave Request
|--------------------------------------------------------------------------
| Approving does two things: it stamps the request and it books the days
| against the employee's usage for that year. Without the second step the
| balance would never move and the same days could be approved again.
|
| The request is re-read before it is stamped so a request that was already
| reviewed, or deleted while the page was open, is reported instead of being
| decided twice.
|
| The stamp itself is a plain update, not a transaction. Nothing subscribes
| to the requests tree, so a transaction there runs its callback against an
| empty local cache: refusing that first null value aborts the transaction
| before it ever reaches the server, and every approval would fail as though
| it had already been reviewed. Booking the days is still a transaction,
| because that callback always returns a value and is safe on a cold cache.
|
| If booking the days fails the stamp is rolled back, so the request is never
| left approved without being paid for.
*/

export const approveLeaveRequest = async (
    companyCode,
    request,
    approver
) => {

    try {

        const keys = requestKeys(request);

        if (!getMonthPath(keys.appliedDate) || !keys.employeeId) {
            return {
                success: false,
                message: "Leave request not found.",
            };
        }

        const employeeId = keys.employeeId;

        const year = getLeaveRequestYear(request);

        const days = Number(request?.days) || 0;

        if (!year || days <= 0) {
            return {
                success: false,
                message: "This leave request is incomplete and cannot be approved.",
            };
        }

        const found = await findRequestRef(companyCode, keys);

        if (!found) {
            return {
                success: false,
                message: "This leave request no longer exists.",
            };
        }

        const requestRef = found.ref;

        if (found.value.status !== LEAVE_STATUS.PENDING) {
            return {
                success: false,
                message: "This leave request has already been reviewed.",
            };
        }

        await update(requestRef, {

            status: LEAVE_STATUS.APPROVED,

            approvedBy: approver,

            approvedAt: Date.now(),

        });

        /*
        | Putting the request back the way it was found, used by both of the
        | steps below so a failure never leaves it approved without having
        | been paid for.
        */

        const revertApproval = () =>
            update(requestRef, {
                status: LEAVE_STATUS.PENDING,
                approvedBy: "",
                approvedAt: null,
            });

        try {

            await changeLeaveUsage(
                companyCode,
                employeeId,
                year,
                days
            );

        } catch (usageError) {

            await revertApproval();

            throw usageError;

        }

        /*
        | The approved days are written onto the attendance sheet, so the
        | leave shows up on the daily list, the monthly report, the reports
        | and the calendar without anyone marking it by hand. A day with no
        | record counts as Absent, so skipping this would report every day of
        | granted leave as an absence.
        |
        | If it fails the days are released and the request goes back to
        | pending. An approval recorded only against the balance would spend
        | the leave on days attendance still counts against the employee, and
        | the request could not be approved a second time to fix it.
        */

        try {

            /*
            | Only the working days of the range are written. A declared
            | holiday inside it was never charged to the balance, so marking
            | it "Leave" would report a day the office was closed as a day of
            | leave and count it twice.
            */

            const holidayDates =
                await getRequestHolidayDates(companyCode, request);

            const workingDateKeys =
                getLeaveWorkingDateKeys(request, holidayDates);

            await applyLeaveAttendance(companyCode, {

                ...toAttendancePayload(request, workingDateKeys),

                status: getLeaveAttendanceStatus(request),

                remarks: getLeaveAttendanceRemarks(request),

            });

        } catch (attendanceError) {

            await changeLeaveUsage(
                companyCode,
                employeeId,
                year,
                -days
            );

            await revertApproval();

            throw attendanceError;

        }

        /*
        | Told only once the approval is paid for and written onto the
        | attendance sheet. Both steps above put the request back to pending
        | when they fail, and a notification cannot be taken back: sending it
        | any earlier leaves the employee holding a permanent "approved" for a
        | request that is pending again.
        */

        try {
            await notifyLeaveApproved(
                companyCode,
                request,
                request.requestId,
                approver
            );

        } catch (notificationError) {
            console.error(
                "Leave approval notification failed:",
                notificationError
            );
        }

        return {
            success: true,
        };

    } catch (error) {

        console.error(
            "Approve Leave Error:",
            error
        );

        throw error;

    }

};
/*
|--------------------------------------------------------------------------
| Reject Leave Request
|--------------------------------------------------------------------------
| Only a pending request can be rejected. An approved one has already been
| booked against the balance, so turning it down is a withdrawal instead.
|
| Read then update, for the same reason as the approval above: a transaction
| on this tree is handed an empty cache first and would abort every time.
*/

export const rejectLeaveRequest = async (
    companyCode,
    request,
    approver,
    remarks
) => {

    try {

        const keys = requestKeys(request);

        if (!getMonthPath(keys.appliedDate) || !keys.employeeId) {
            return {
                success: false,
                message: "Leave request not found.",
            };
        }

        const found = await findRequestRef(companyCode, keys);

        if (!found) {
            return {
                success: false,
                message: "This leave request no longer exists.",
            };
        }

        const requestRef = found.ref;

        if (found.value.status !== LEAVE_STATUS.PENDING) {
            return {
                success: false,
                message: "This leave request has already been reviewed.",
            };
        }

        await update(requestRef, {

            status: LEAVE_STATUS.REJECTED,

            approvedBy: approver,

            approvedAt: Date.now(),

            remarks,

        });

        // Creating notifications
        try {
            await notifyLeaveRejected(
                companyCode,
                request,
                request.requestId,
                approver
            );

        } catch (notificationError) {
            console.error(
                "Leave rejection notification failed:",
                notificationError
            );
        }

        return {
            success: true,
        };

    } catch (error) {

        console.error(
            "Reject Leave Error:",
            error
        );

        throw error;

    }

};
/*
|--------------------------------------------------------------------------
| Delete Leave Request
|--------------------------------------------------------------------------
| Deleting an approved request has to give the days back, otherwise the
| balance stays spent on leave that no longer exists.
*/

export const deleteLeaveRequest = async (
    companyCode,
    request
) => {

    try {

        const keys = requestKeys(request);

        if (!getMonthPath(keys.appliedDate) || !keys.employeeId) {
            return {
                success: false,
                message: "Leave request not found.",
            };
        }

        const employeeId = keys.employeeId;

        /*
        | Located before anything is given back, so a request that is already
        | gone cannot release days a second time.
        */

        const found = await findRequestRef(companyCode, keys);

        if (!found) {
            return {
                success: false,
                message: "This leave request no longer exists.",
            };
        }

        const wasApproved =
            request?.status === LEAVE_STATUS.APPROVED;

        /*
        | The days an approved request booked on the attendance sheet are
        | given back before the request itself is removed. Doing it first
        | means a failure here leaves the request, the balance and the
        | attendance records all still agreeing with each other, and the
        | delete can simply be tried again.
        */

        if (wasApproved) {

            await clearLeaveAttendance(
                companyCode,
                toAttendancePayload(request)
            );

        }

        await remove(found.ref);

        if (wasApproved) {

            const year = getLeaveRequestYear(request);

            const days = Number(request?.days) || 0;

            if (year && days > 0) {

                await changeLeaveUsage(
                    companyCode,
                    employeeId,
                    year,
                    -days
                );

            }

        }

        return {
            success: true,
        };

    } catch (error) {

        console.error(
            "Delete Leave Error:",
            error
        );

        throw error;

    }

};
