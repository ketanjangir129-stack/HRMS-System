import {
  createNotification,
} from "./notificationService";

import {
  getLeaveApproverIds,
  getEmployeeName,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";

import {
  formatLeaveRange,
} from "../../utils/leave/leaveUtils";


export const notifyLeaveApprovers = async (
  companyCode,
  request,
  requestId
) => {

  /*
  | The employee is passed on so the managers of their department are told as
  | well as HR - they are the ones the request lands in front of.
  */
  const approverIds =
    await getLeaveApproverIds(
      companyCode,
      { employeeId: request?.employeeId }
    );

  if (!approverIds.length) {
    return;
  }

  /*
  | The request only carries a name when it arrives from a screen that has
  | already joined the directory onto it. The one raised by the apply modal
  | has not, so the directory is read before falling back to the bare id.
  */

  const employeeName =
    request?.employeeName ||
    request?.employee?.name ||
    await getEmployeeName(
      companyCode,
      request?.employeeId
    ) ||
    request?.employeeId ||
    "An employee";

  const dateText =
    formatLeaveRange(request);


  await Promise.all(

    approverIds.map(
      (recipientId) =>

        createNotification(
          companyCode,
          recipientId,
          {

            event:
              NOTIFICATION_EVENTS
                .LEAVE_APPLIED,

            type:
              NOTIFICATION_TYPES.LEAVE,

            title:
              "New Leave Request",

            message:
              `${employeeName} has applied for leave for ${dateText}.`,

            entityType:
              "leave",

            entityId:
              requestId,

            route:
              "/leave/approvals",

            createdBy:
              request?.employeeId ||
              "",

          }
        )
    )

  );

};
export const notifyLeaveApproved = async (
  companyCode,
  request,
  requestId,
  approver
) => {

  const employeeId = request?.employeeId;

  if (!employeeId) {
    return;
  }

  const dateText =
    formatLeaveRange(request);

  await createNotification(
    companyCode,
    employeeId,
    {
      event: NOTIFICATION_EVENTS.LEAVE_APPROVED,

      type: NOTIFICATION_TYPES.LEAVE,

      title: "Leave Approved",

      message:
        `Your leave request for ${dateText} has been approved.`,

      entityType: "leave",

      entityId: requestId,

      route: "/leave",

      createdBy: approver || "",
    }
  );
};


export const notifyLeaveRejected = async (
  companyCode,
  request,
  requestId,
  approver
) => {

  const employeeId = request?.employeeId;

  if (!employeeId) {
    return;
  }

  const dateText =
    formatLeaveRange(request);

  await createNotification(
    companyCode,
    employeeId,
    {
      event: NOTIFICATION_EVENTS.LEAVE_REJECTED,

      type: NOTIFICATION_TYPES.LEAVE,

      title: "Leave Rejected",

      message:
        `Your leave request for ${dateText} has been rejected.`,

      entityType: "leave",

      entityId: requestId,

      route: "/leave",

      createdBy: approver || "",
    }
  );
};