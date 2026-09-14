import { createNotification } from "./notificationService";

import {
  getHrRecipientIds,
  getResignationManagerIds,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";

import { formatDate } from "../../utils/resignation/resignationUtils";

/*
|--------------------------------------------------------------------------
| Resignation Notifications
|--------------------------------------------------------------------------
| Who is told what, at each hand-off of an exit.
|
| A resignation is a queue rather than an announcement - see the note in
| `notificationRecipientService` - so every function here writes to exactly
| the group whose turn it is. The employee is told at each step as well,
| separately, because it is their exit and watching it move is the whole
| point of the tracker on their profile.
|
| Nothing here throws on its own account: `createNotification` can fail, and
| the service above catches it. A notification is an announcement of a write
| that has already succeeded, and losing one must never undo the decision it
| was announcing.
|--------------------------------------------------------------------------
*/

const ROUTE = {
  /* Where an approver acts. */
  approvals: "/resignation/approvals",
  /* Where the employee watches their own. */
  mine: "/resignation",
};

/* The same notification to a list of people, in parallel. */
const notifyAll = async (companyCode, recipientIds, notification) => {

  if (!recipientIds?.length) return;

  await Promise.all(
    recipientIds.map((recipientId) =>
      createNotification(companyCode, recipientId, notification)
    )
  );

};

/* The employee a record is about, as a name worth reading. */
const nameOf = (resignation) =>
  resignation?.name || resignation?.employeeId || "An employee";

/*
|--------------------------------------------------------------------------
| Raised
|--------------------------------------------------------------------------
| Goes to the department's managers if it has any, and to HR if it does not.
|
| That fallback is what stops a resignation disappearing. A department with
| no manager appointed would otherwise leave the record in MANAGER_PENDING
| with an empty recipient list - which writes nothing and reports no error,
| so the exit would simply sit there until somebody thought to look.
|--------------------------------------------------------------------------
*/

export const notifyResignationRaised = async (companyCode, resignation) => {

  const managerIds = await getResignationManagerIds(
    companyCode,
    resignation?.employeeId
  );

  const recipientIds = managerIds.length
    ? managerIds
    : await getHrRecipientIds(companyCode);

  await notifyAll(companyCode, recipientIds, {
    event: NOTIFICATION_EVENTS.RESIGNATION_RAISED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "New Resignation",
    message: `${nameOf(resignation)} has resigned, with ${formatDate(
      resignation?.requestedLastWorkingDay
    )} as their intended last working day.`,
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: ROUTE.approvals,
    createdBy: resignation?.employeeId || "",
  });

  /* The person who filed it, so the tracker is not the only place it shows. */
  await createNotification(companyCode, resignation?.employeeId, {
    event: NOTIFICATION_EVENTS.RESIGNATION_RAISED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "Resignation Submitted",
    message: managerIds.length
      ? "Your resignation has been sent to your department manager for approval."
      : "Your resignation has been sent to HR for approval.",
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: ROUTE.mine,
    createdBy: resignation?.employeeId || "",
  });

};

/*
|--------------------------------------------------------------------------
| Manager Approved — Over To HR
|--------------------------------------------------------------------------
*/

export const notifyManagerApproved = async (
  companyCode,
  resignation,
  actor
) => {

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_MANAGER_APPROVED,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Resignation Awaiting HR",
      message: `${nameOf(resignation)}'s resignation was approved by their manager and needs your approval.`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: ROUTE.approvals,
      createdBy: actor?.employeeId || "",
    }
  );

  await createNotification(companyCode, resignation?.employeeId, {
    event: NOTIFICATION_EVENTS.RESIGNATION_MANAGER_APPROVED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "Manager Approved",
    message: "Your manager has approved your resignation. It is now with HR.",
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: ROUTE.mine,
    createdBy: actor?.employeeId || "",
  });

};

/*
|--------------------------------------------------------------------------
| Rejected
|--------------------------------------------------------------------------
| The reason travels in the message. A rejection the employee has to go and
| look up is one they will ask about anyway.
|--------------------------------------------------------------------------
*/

export const notifyResignationRejected = async (
  companyCode,
  resignation,
  actor,
  stage,
  reason
) => {

  const by = stage === "manager" ? "your manager" : "HR";

  await createNotification(companyCode, resignation?.employeeId, {
    event: NOTIFICATION_EVENTS.RESIGNATION_REJECTED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "Resignation Rejected",
    message: `Your resignation was rejected by ${by}. Reason: ${reason}`,
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: ROUTE.mine,
    createdBy: actor?.employeeId || "",
  });

  /*
  | HR is told when a manager turns one down. They are the next step in every
  | other branch of this flow and the ones an employee will go to about it,
  | so finding out only when asked is the wrong way round.
  */
  if (stage === "manager") {

    await notifyAll(
      companyCode,
      await getHrRecipientIds(companyCode),
      {
        event: NOTIFICATION_EVENTS.RESIGNATION_REJECTED,
        type: NOTIFICATION_TYPES.RESIGNATION,
        title: "Resignation Rejected by Manager",
        message: `${nameOf(resignation)}'s resignation was rejected by their manager. Reason: ${reason}`,
        entityType: "resignation",
        entityId: resignation?.resignationId,
        route: ROUTE.approvals,
        createdBy: actor?.employeeId || "",
      }
    );

  }

};

/*
|--------------------------------------------------------------------------
| Equipment
|--------------------------------------------------------------------------
| The request goes to the employee and duplicates what the email says. The
| email can bounce, land in spam, or arrive at a mailbox already being wound
| down; the in-app notification is the copy that cannot.
|--------------------------------------------------------------------------
*/

export const notifyEquipmentRequested = async (
  companyCode,
  resignation,
  actor
) => {

  await createNotification(companyCode, resignation?.employeeId, {
    event: NOTIFICATION_EVENTS.RESIGNATION_EQUIPMENT_REQUESTED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "Return Company Equipment",
    message: `HR approved your resignation. Your last working day is ${formatDate(
      resignation?.lastWorkingDay
    )} — please complete the equipment submission form.`,
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: `/resignation/equipment/${resignation?.resignationId}`,
    createdBy: actor?.employeeId || "",
  });

};

export const notifyEquipmentSubmitted = async (companyCode, resignation) => {

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_EQUIPMENT_SUBMITTED,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Equipment Declared",
      message: `${nameOf(resignation)} has submitted their equipment form. The full & final settlement can now be prepared.`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: `/resignation/settlement/${resignation?.resignationId}`,
      createdBy: resignation?.employeeId || "",
    }
  );

};

/*
|--------------------------------------------------------------------------
| The Settlement
|--------------------------------------------------------------------------
*/

export const notifyFnFUnderReview = async (
  companyCode,
  resignation,
  actor
) => {

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_FNF_REVIEW,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Settlement Ready for Review",
      message: `The full & final settlement for ${nameOf(resignation)} is ready to be reviewed.`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: `/resignation/settlement/${resignation?.resignationId}`,
      createdBy: actor?.employeeId || "",
    }
  );

};

/* A settlement sent back to be re-worked, with what needs correcting. */
export const notifyFnFReady = async (companyCode, resignation, reason) => {

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_FNF_RETURNED,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Settlement Returned",
      message: `The settlement for ${nameOf(resignation)} was sent back for correction. Reason: ${reason}`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: `/resignation/settlement/${resignation?.resignationId}`,
      createdBy: "",
    }
  );

};

/*
| Finance's turn.
|
| Written to HR and the owner rather than to whoever actually holds
| `resignation.financeApprove`. That permission is a company-wide switch in
| Roles & Access, not a field on anybody's employee record, so there is no
| list of its holders to read here - working one out would mean loading the
| role configuration and every employee to cross them. The owner always holds
| it, and is always on this list.
*/

export const notifyFinanceApprovalPending = async (
  companyCode,
  resignation,
  actor
) => {

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_FINANCE_PENDING,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Settlement Awaiting Finance",
      message: `${nameOf(resignation)}'s settlement has been reviewed and needs finance approval before the exit can be completed.`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: `/resignation/settlement/${resignation?.resignationId}`,
      createdBy: actor?.employeeId || "",
    }
  );

};

/*
|--------------------------------------------------------------------------
| Exited
|--------------------------------------------------------------------------
*/

export const notifyExitCompleted = async (
  companyCode,
  resignation,
  actor
) => {

  await createNotification(companyCode, resignation?.employeeId, {
    event: NOTIFICATION_EVENTS.RESIGNATION_EXITED,
    type: NOTIFICATION_TYPES.RESIGNATION,
    title: "Exit Completed",
    message:
      "Your full & final settlement has been approved and your exit is complete. Your No Objection Certificate has been emailed to you.",
    entityType: "resignation",
    entityId: resignation?.resignationId,
    route: `/resignation/noc/${resignation?.resignationId}`,
    createdBy: actor?.employeeId || "",
  });

  await notifyAll(
    companyCode,
    await getHrRecipientIds(companyCode),
    {
      event: NOTIFICATION_EVENTS.RESIGNATION_EXITED,
      type: NOTIFICATION_TYPES.RESIGNATION,
      title: "Exit Completed",
      message: `${nameOf(resignation)} has exited the company. The NOC has been issued.`,
      entityType: "resignation",
      entityId: resignation?.resignationId,
      route: `/resignation/noc/${resignation?.resignationId}`,
      createdBy: actor?.employeeId || "",
    }
  );

};
