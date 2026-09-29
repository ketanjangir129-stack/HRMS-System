import {
  createNotification,
} from "./notificationService";

import {
  getLeaveApproverIds as getApproverIds,
  getEmployeeName,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";

import {
  formatDate,
} from "../../utils/attendance/attendanceDate";

import {
  getRequestTypeLabel,
} from "../../utils/attendance/attendanceRequestUtils";


/*
|--------------------------------------------------------------------------
| Attendance Correction Notifications
|--------------------------------------------------------------------------
| The attendance twin of `leaveNotificationService`: the same three moments,
| the same recipients and the same shape of payload.
|
| The approver list is shared with leave rather than duplicated. An
| attendance correction is reviewed by exactly the people who review a leave
| request — active HR, the owner, and the managers of the employee's own
| department — so a second lookup would only be the same query under a
| different name, and the two would drift apart the first time either side
| changed who may approve.
|
| Both routes point at `/attendance/requests`: employees and HR land on the
| same page, which scopes itself to "mine" or "all" from the signed in role.
|--------------------------------------------------------------------------
*/

/*
| The name to show, resolved the same way leave resolves it. A request stores
| the employee id and nothing else, and the join onto the directory happens up
| in the page — far above the service that writes the notification — so
| without this read every approver would be told that "WV001" raised it.
*/

const resolveEmployeeName = async (
  companyCode,
  request
) =>
  request?.employeeName ||
  request?.employee?.name ||
  await getEmployeeName(
    companyCode,
    request?.employeeId
  ) ||
  request?.employeeId ||
  "An employee";


/*
| "Late Check In for 05 Aug 2026" — the type and the day are what identifies a
| correction, the way a date range identifies a leave request.
*/

const describeRequest = (request = {}) =>
  `${getRequestTypeLabel(request.type)} for ${formatDate(request.date)}`;


export const notifyAttendanceCorrectionApprovers = async (
  companyCode,
  request,
  requestId
) => {

  /*
  | The employee is passed on so the managers of their department are told as
  | well as HR - they are the ones the correction lands in front of.
  */
  const approverIds =
    await getApproverIds(
      companyCode,
      { employeeId: request?.employeeId }
    );

  if (!approverIds.length) {
    return;
  }

  const employeeName =
    await resolveEmployeeName(
      companyCode,
      request
    );

  await Promise.all(

    approverIds.map(
      (recipientId) =>

        createNotification(
          companyCode,
          recipientId,
          {

            event:
              NOTIFICATION_EVENTS
                .ATTENDANCE_CORRECTION_APPLIED,

            type:
              NOTIFICATION_TYPES.ATTENDANCE,

            title:
              "New Attendance Correction Request",

            message:
              `${employeeName} has raised an attendance correction request — ${describeRequest(request)}.`,

            entityType:
              "attendanceRequest",

            entityId:
              requestId,

            route:
              "/attendance/requests",

            createdBy:
              request?.employeeId ||
              "",

          }
        )
    )

  );

};


export const notifyAttendanceCorrectionApproved = async (
  companyCode,
  request,
  requestId,
  approver
) => {

  const employeeId = request?.employeeId;

  if (!employeeId) {
    return;
  }

  await createNotification(
    companyCode,
    employeeId,
    {
      event:
        NOTIFICATION_EVENTS
          .ATTENDANCE_CORRECTION_APPROVED,

      type: NOTIFICATION_TYPES.ATTENDANCE,

      title: "Attendance Correction Approved",

      message:
        `Your attendance correction request — ${describeRequest(request)} — has been approved.`,

      entityType: "attendanceRequest",

      entityId: requestId,

      route: "/attendance/requests",

      createdBy: approver || "",
    }
  );
};


export const notifyAttendanceCorrectionRejected = async (
  companyCode,
  request,
  requestId,
  approver,
  remarks
) => {

  const employeeId = request?.employeeId;

  if (!employeeId) {
    return;
  }

  /*
  | Remarks are mandatory on a rejection, so they are carried into the
  | message: the employee is told why without having to open the request.
  */

  const reason = remarks?.trim();

  await createNotification(
    companyCode,
    employeeId,
    {
      event:
        NOTIFICATION_EVENTS
          .ATTENDANCE_CORRECTION_REJECTED,

      type: NOTIFICATION_TYPES.ATTENDANCE,

      title: "Attendance Correction Rejected",

      message:
        `Your attendance correction request — ${describeRequest(request)} — has been rejected.` +
        (reason ? ` Remarks: ${reason}` : ""),

      entityType: "attendanceRequest",

      entityId: requestId,

      route: "/attendance/requests",

      createdBy: approver || "",
    }
  );
};
