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
} from "../../utils/leave/leaveUtils";
import {
  applyLeaveAttendance,
  clearLeaveAttendance,
} from "../attendanceServices/attendanceService";

const DEFAULT_SETTINGS = {
  annualLeaves: 12,
  monthlyAccrual: 1,
  allowCarryForward: true,
  maxCarryForward: 5,
};

/*
| Push keys are generated from the timestamp plus a random component, so two
| people applying in the same millisecond cannot end up with the same id.
*/

const generateLeaveRequestId = (companyCode) => {

  const key = push(
    ref(
      db,
      `companies/${companyCode}/leave/requests`
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

const toAttendancePayload = (request) => ({

  employeeId: request?.employeeId,

  dateKeys: getLeaveDateKeys(request),

  leaveRequestId: request?.requestId,

});

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

        const requestId =
            generateLeaveRequestId(companyCode);

        await set(

            ref(
                db,
                `companies/${companyCode}/leave/requests/${requestId}`
            ),

            {
                requestId,

                ...request,

                status: LEAVE_STATUS.PENDING,

                requestedAt: Date.now(),

                approvedBy: "",

                approvedAt: null,

                remarks: "",
            }

        );

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
*/

export const getLeaveRequests = async (
    companyCode
) => {

    try {

        const snapshot = await get(

            ref(
                db,
                `companies/${companyCode}/leave/requests`
            )

        );

        if (!snapshot.exists()) {
            return [];
        }

        return Object.values(
            snapshot.val()
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

        const requestId = request?.requestId;

        if (!requestId) {
            return {
                success: false,
                message: "Leave request not found.",
            };
        }

        const employeeId = request?.employeeId;

        const year = getLeaveRequestYear(request);

        const days = Number(request?.days) || 0;

        if (!employeeId || !year || days <= 0) {
            return {
                success: false,
                message: "This leave request is incomplete and cannot be approved.",
            };
        }

        const requestRef = ref(
            db,
            `companies/${companyCode}/leave/requests/${requestId}`
        );

        const snapshot = await get(requestRef);

        if (!snapshot.exists()) {
            return {
                success: false,
                message: "This leave request no longer exists.",
            };
        }

        if (snapshot.val().status !== LEAVE_STATUS.PENDING) {
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

            await applyLeaveAttendance(companyCode, {

                ...toAttendancePayload(request),

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
    requestId,
    approver,
    remarks
) => {

    try {

        const requestRef = ref(
            db,
            `companies/${companyCode}/leave/requests/${requestId}`
        );

        const snapshot = await get(requestRef);

        if (!snapshot.exists()) {
            return {
                success: false,
                message: "This leave request no longer exists.",
            };
        }

        if (snapshot.val().status !== LEAVE_STATUS.PENDING) {
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

        const requestId = request?.requestId;

        if (!requestId) {
            return {
                success: false,
                message: "Leave request not found.",
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

        await remove(

            ref(
                db,
                `companies/${companyCode}/leave/requests/${requestId}`
            )

        );

        if (wasApproved) {

            const year = getLeaveRequestYear(request);

            const days = Number(request?.days) || 0;

            if (request.employeeId && year && days > 0) {

                await changeLeaveUsage(
                    companyCode,
                    request.employeeId,
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
