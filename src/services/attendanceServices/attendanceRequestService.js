import { db } from "../../firebase/firebase";
import {
    ref,
    get,
    set,
    update,
    remove
} from "firebase/database";
import {updateAttendanceRecord} from "./attendanceService";


const generateRequestId = () => `REQ_${Date.now()}`;


//Creating Attendance Request
export const createAttendanceRequest = async (
    companyCode,
    request
) => {

    const requestId = generateRequestId();

    await set(
        ref(
            db,
            `companies/${companyCode}/attendance/requests/${requestId}`
        ),
        {
            requestId,
            ...request,
            status: "Pending",
            requestedAt: Date.now(),
            approvedBy: "",
            approvedAt: null,
            remarks: ""

        }
    );
    return {
        success: true
    };
};

//fetching requests for a specific employee
export const getAttendanceRequests = async (
    companyCode
) => {

    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}/attendance/requests`
        )
    );
    if (!snapshot.exists()) {
        return [];
    }
    return Object.values(snapshot.val());
};

//Approving Attendance Request
export const approveAttendanceRequest = async (
  companyCode,
  request,
  hrName
) => {

  const attendanceResult =
    await updateAttendanceRecord(
      companyCode,
      request
    );

  if (!attendanceResult.success) {

    return attendanceResult;

  }

  const requestRef = ref(
    db,
    `companies/${companyCode}/attendance/requests/${request.requestId}`
  );

  await update(requestRef, {

    status: "Approved",

    approvedBy: hrName,

    approvedAt: Date.now(),

  });

  return {

    success: true,

  };

};

//rejecting Attendance Request
export const rejectAttendanceRequest = async (
    companyCode,
    requestId,
    hrName,
    remarks
) => {
    const requestRef = ref(
        db,
        `companies/${companyCode}/attendance/requests/${requestId}`
    );

    await update(
        requestRef,
        {
            status: "Rejected",
            approvedBy: hrName,
            approvedAt: Date.now(),
            remarks
        }
    );
    return {
        success: true
    };

};

//updating Attendance Request (only pending ones can be edited)
export const updateAttendanceRequest = async (
    companyCode,
    requestId,
    updates
) => {
    await update(
        ref(
            db,
            `companies/${companyCode}/attendance/requests/${requestId}`
        ),
        {
            ...updates,
            updatedAt: Date.now(),
        }
    );
    return {
        success: true
    };
};

//deleting Attendance Request
export const deleteAttendanceRequest = async (
    companyCode,
    requestId
) => {
    await remove(
        ref(
            db,
            `companies/${companyCode}/attendance/requests/${requestId}`
        )
    );
};
