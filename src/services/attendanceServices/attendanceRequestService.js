import { db } from "../../firebase/firebase";
import {
    ref,
    get,
    set,
    update,
    remove,
    onValue,
    push,
} from "firebase/database";
import { updateAttendanceRecord } from "./attendanceService";
import { REQUEST_STATUS } from "../../utils/attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Attendance Request Service
|--------------------------------------------------------------------------
| The only place that talks to the attendance requests branch.
|
| A request stores the employee id and nothing else about the employee; the
| name, department and designation are resolved from the employees collection
| wherever they are displayed.
|
| companies/{companyCode}/attendance/requests/{requestId}
|--------------------------------------------------------------------------
*/

const requestsPath = (companyCode) =>
    `companies/${companyCode}/attendance/requests`;

const requestPath = (companyCode, requestId) =>
    `${requestsPath(companyCode)}/${requestId}`;

/*
| Firebase push keys are unique even when two requests are created in the same
| millisecond, which a timestamp based id cannot guarantee.
*/

const generateRequestId = (companyCode) =>
    `REQ_${push(ref(db, requestsPath(companyCode))).key}`;

/*
| Every action below has to be sure the request is still pending: the list is
| realtime, so a request can be decided by someone else between the moment it
| was rendered and the moment the button was pressed.
*/

const getPendingRequest = async (companyCode, requestId) => {

    const snapshot = await get(
        ref(db, requestPath(companyCode, requestId))
    );

    if (!snapshot.exists()) {
        return {
            success: false,
            message: "Request not found.",
        };
    }

    const request = snapshot.val();

    if (request.status !== REQUEST_STATUS.PENDING) {
        return {
            success: false,
            message: `This request has already been ${request.status.toLowerCase()}.`,
        };
    }

    return {
        success: true,
        request,
    };

};

/*
|--------------------------------------------------------------------------
| Subscribe
|--------------------------------------------------------------------------
| Newest first, so the list and the dashboard card agree on the order.
*/

export const subscribeToAttendanceRequests = (
    companyCode,
    onData,
    onError
) =>
    onValue(
        ref(db, requestsPath(companyCode)),
        (snapshot) => {

            const requests = snapshot.exists()
                ? Object.values(snapshot.val())
                : [];

            requests.sort(
                (a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)
            );

            onData(requests);

        },
        onError
    );

/*
|--------------------------------------------------------------------------
| Create
|--------------------------------------------------------------------------
*/

export const createAttendanceRequest = async (
    companyCode,
    request
) => {

    const requestId = generateRequestId(companyCode);

    await set(ref(db, requestPath(companyCode, requestId)), {

        requestId,

        employeeId: request.employeeId,

        type: request.type,

        date: request.date,

        requestedPunchIn: request.requestedPunchIn ?? null,

        requestedPunchOut: request.requestedPunchOut ?? null,

        reason: request.reason || "",

        status: REQUEST_STATUS.PENDING,

        requestedAt: Date.now(),

        approvedBy: "",

        approvedAt: null,

        remarks: "",

    });

    return { success: true };

};

/*
|--------------------------------------------------------------------------
| Update (pending only)
|--------------------------------------------------------------------------
*/

export const updateAttendanceRequest = async (
    companyCode,
    requestId,
    updates
) => {

    const pending = await getPendingRequest(companyCode, requestId);

    if (!pending.success) return pending;

    await update(ref(db, requestPath(companyCode, requestId)), {
        type: updates.type,
        date: updates.date,
        requestedPunchIn: updates.requestedPunchIn ?? null,
        requestedPunchOut: updates.requestedPunchOut ?? null,
        reason: updates.reason || "",
        updatedAt: Date.now(),
    });

    return { success: true };

};

/*
|--------------------------------------------------------------------------
| Delete (pending only)
|--------------------------------------------------------------------------
*/

export const deleteAttendanceRequest = async (
    companyCode,
    requestId
) => {

    const pending = await getPendingRequest(companyCode, requestId);

    if (!pending.success) return pending;

    await remove(ref(db, requestPath(companyCode, requestId)));

    return { success: true };

};

/*
|--------------------------------------------------------------------------
| Approve
|--------------------------------------------------------------------------
| The attendance record is written first. If that write fails the request is
| left Pending, so a request is never marked Approved without the attendance
| it promised.
*/

export const approveAttendanceRequest = async (
    companyCode,
    request,
    approvedBy
) => {

    const pending = await getPendingRequest(
        companyCode,
        request.requestId
    );

    if (!pending.success) return pending;

    let attendanceResult;

    try {

        attendanceResult = await updateAttendanceRecord(
            companyCode,
            pending.request
        );

    } catch (error) {

        console.error("Failed to apply attendance changes:", error);

        return {
            success: false,
            message:
                "Attendance could not be updated. The request is still pending.",
        };

    }

    if (!attendanceResult?.success) {
        return attendanceResult;
    }

    await update(ref(db, requestPath(companyCode, request.requestId)), {
        status: REQUEST_STATUS.APPROVED,
        approvedBy,
        approvedAt: Date.now(),
        remarks: "",
    });

    return { success: true };

};

/*
|--------------------------------------------------------------------------
| Reject (remarks required)
|--------------------------------------------------------------------------
*/

export const rejectAttendanceRequest = async (
    companyCode,
    requestId,
    approvedBy,
    remarks
) => {

    if (!remarks?.trim()) {
        return {
            success: false,
            message: "Remarks are required to reject a request.",
        };
    }

    const pending = await getPendingRequest(companyCode, requestId);

    if (!pending.success) return pending;

    await update(ref(db, requestPath(companyCode, requestId)), {
        status: REQUEST_STATUS.REJECTED,
        approvedBy,
        approvedAt: Date.now(),
        remarks: remarks.trim(),
    });

    return { success: true };

};
