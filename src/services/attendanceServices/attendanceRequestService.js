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
import { getMonthPath } from "../../utils/attendance/attendanceDate";

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
| companies/{companyCode}/attendance/requests/{year}/{Month}/{YYYY-MM-DD}/{employeeId}
|
| Keyed exactly like an attendance record: the year, the month, the day it is
| about, then who it is about. A request is addressed by the day and the
| employee it corrects, so it sits next to the record it will change and one
| employee has one request per day. Raising a second request for the same day
| replaces the first.
|
| The year and month are never stored on a request: they are the nodes the
| request lives in, and deriving them from the date is the only way they can
| never disagree.
|--------------------------------------------------------------------------
*/

const requestsPath = (companyCode) =>
    `companies/${companyCode}/attendance/requests`;

const requestPath = (companyCode, date, employeeId) =>
    `${requestsPath(companyCode)}/${getMonthPath(date)}/${date}/${employeeId}`;

/*
| The date and the employee of a request, which together are its address.
| Both are plain fields of the request, so every caller can hand the request
| itself over instead of carrying its location around separately.
*/

const requestKeys = (request) => ({
    date: request?.date,
    employeeId: request?.employeeId,
});

/*
| The id stays a field of the request rather than its key. Nothing addresses a
| request by it any more, but it is what the detail views display and what
| tells two requests apart in a list, so it still has to be unique.
|
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

const getPendingRequest = async (companyCode, date, employeeId) => {

    /*
    | A missing key would build a path that points at the whole date bucket, or
    | at the requests root, and the checks below would then be run against
    | somebody else's request. The month is derived from the date, so a date
    | that is not a real key is caught by the same check.
    */

    if (!getMonthPath(date) || !employeeId) {
        return {
            success: false,
            message: "Request not found.",
        };
    }

    const snapshot = await get(
        ref(db, requestPath(companyCode, date, employeeId))
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
|
| The year, month and date buckets are flattened away before the list is
| handed over: every page below works on a plain list of requests and none of
| them cares which node a request is filed under.
*/

const flattenRequests = (years) =>
    Object.values(years || {}).flatMap(
        (months) => Object.values(months || {}).flatMap(
            (dates) => Object.values(dates || {}).flatMap(
                (employees) => Object.values(employees || {})
            )
        )
    );

export const subscribeToAttendanceRequests = (
    companyCode,
    onData,
    onError
) =>
    onValue(
        ref(db, requestsPath(companyCode)),
        (snapshot) => {

            const requests = flattenRequests(snapshot.val());

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

    const { date, employeeId } = requestKeys(request);

    /*
    | Both are part of the path, so a missing one is refused here rather than
    | being written to a path Firebase would reject or, worse, one that
    | overwrites the whole date bucket. The month comes from the date, so a
    | date that is not a real key fails the same check.
    */

    if (!getMonthPath(date) || !employeeId) {
        return {
            success: false,
            message: "A valid date and an employee are required to raise a request.",
        };
    }

    const requestId = generateRequestId(companyCode);

    await set(ref(db, requestPath(companyCode, date, employeeId)), {

        requestId,

        employeeId,

        type: request.type,

        date,

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
| The date and the employee are the address, so an edit that changes either of
| them moves the request instead of changing a field in place. Patching the old
| node would leave the request filed under a day or an employee it is no longer
| about, and a later request for that day would never find it to replace it.
|
| A reviewer can reassign the employee from the edit form, which is why the
| employee is treated the same way as the date here.
*/

export const updateAttendanceRequest = async (
    companyCode,
    request,
    updates
) => {

    const { date, employeeId } = requestKeys(request);

    const pending = await getPendingRequest(
        companyCode,
        date,
        employeeId
    );

    if (!pending.success) return pending;

    const nextDate = updates.date || date;

    const nextEmployeeId = updates.employeeId || employeeId;

    const fields = {
        employeeId: nextEmployeeId,
        type: updates.type,
        date: nextDate,
        requestedPunchIn: updates.requestedPunchIn ?? null,
        requestedPunchOut: updates.requestedPunchOut ?? null,
        reason: updates.reason || "",
        updatedAt: Date.now(),
    };

    const moved =
        nextDate !== date || nextEmployeeId !== employeeId;

    if (!moved) {

        await update(
            ref(db, requestPath(companyCode, date, employeeId)),
            fields
        );

        return { success: true };

    }

    /*
    | Written to the new address before the old one is dropped, so a failure
    | halfway leaves the request where it was rather than losing it.
    */

    await set(
        ref(db, requestPath(companyCode, nextDate, nextEmployeeId)),
        { ...pending.request, ...fields }
    );

    await remove(
        ref(db, requestPath(companyCode, date, employeeId))
    );

    return { success: true };

};

/*
|--------------------------------------------------------------------------
| Delete (pending only)
|--------------------------------------------------------------------------
*/

export const deleteAttendanceRequest = async (
    companyCode,
    request
) => {

    const { date, employeeId } = requestKeys(request);

    const pending = await getPendingRequest(
        companyCode,
        date,
        employeeId
    );

    if (!pending.success) return pending;

    await remove(ref(db, requestPath(companyCode, date, employeeId)));

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

    const { date, employeeId } = requestKeys(request);

    const pending = await getPendingRequest(
        companyCode,
        date,
        employeeId
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

    await update(ref(db, requestPath(companyCode, date, employeeId)), {
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
    request,
    approvedBy,
    remarks
) => {

    if (!remarks?.trim()) {
        return {
            success: false,
            message: "Remarks are required to reject a request.",
        };
    }

    const { date, employeeId } = requestKeys(request);

    const pending = await getPendingRequest(
        companyCode,
        date,
        employeeId
    );

    if (!pending.success) return pending;

    await update(ref(db, requestPath(companyCode, date, employeeId)), {
        status: REQUEST_STATUS.REJECTED,
        approvedBy,
        approvedAt: Date.now(),
        remarks: remarks.trim(),
    });

    return { success: true };

};
