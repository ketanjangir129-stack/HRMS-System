import {
  createNotification,
} from "./notificationService";

import {
  getEmployeeName,
} from "./notificationRecipientService";

import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
} from "../../utils/notifications/notificationConstants";

import {
  formatDate,
  isOverdue,
  todayInputValue,
} from "../../utils/tasks/taskUtils";

import {
  COMPLETED_STATUS,
  markTaskDueNotified,
  TASK_NOTIFIED_FIELDS,
} from "../taskService";


/*
|--------------------------------------------------------------------------
| Task Notifications
|--------------------------------------------------------------------------
| The task module's own writer, the same shape `leaveNotificationService`
| has: the page decides nothing here, it only hands over the task and who
| acted. Wording, recipients and the self-action guard all live in this one
| file, so a task raised from the board and a task completed from the
| dashboard card can never announce themselves differently.
|
| Nothing here reads Firebase directly and nothing reads the signed in user.
| `actionUser` arrives from `getCurrentActionUser(currentUser)`, which is
| already the identity the rest of the module writes into `createdById` and
| into every activity entry — and, not by coincidence, the very key the
| notification inbox is addressed by. Owner is `"owner"`, everybody else is
| their employee id, on both sides of the write.
|
| These functions throw on a failed write. That is deliberate and matches
| leave: the caller wraps the call in try/catch and swallows it, so a
| notification that cannot be written never fails the task action that
| earned it.
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| Shared
|--------------------------------------------------------------------------
*/

/*
| Everything a task notification carries that never varies. Kept in one
| place so a future `/tasks/:id` route is a single edit rather than four.
|
| `entityId` is the task's Firebase push key. It is not stored inside the
| record — `flattenRun` re-attaches it as `id` on the way out — so that is
| where it is read from.
*/

const taskDefaults = (task) => ({
  type: NOTIFICATION_TYPES.TASK,
  entityType: "task",
  entityId: task?.id || "",
  route: "/tasks",
});


/*
| The one write every function below goes through.
|
| A recipient that equals the actor is dropped here rather than at the four
| call sites, because the rule is the same every time and a call site that
| forgets it produces the most irritating bug this feature can have: being
| told about your own click. Both sides are the same key space, so the
| comparison holds for the owner (`"owner"`) exactly as it does for an
| employee id.
|
| An empty recipient is dropped for the same reason `createNotification`
| refuses it: a task with no assignee has nobody to tell.
*/

const notifyRecipient = async (
  companyCode,
  recipientId,
  actionUser,
  notification
) => {

  if (
    !recipientId ||
    recipientId === actionUser?.id
  ) {
    return;
  }

  await createNotification(
    companyCode,
    recipientId,
    {
      ...notification,
      createdBy: actionUser?.id || "",
    }
  );

};


/*
| "Due Aug 22, 2026." or "No due date." — `formatDate` already answers both
| cases, including the empty one, so the due date is never formatted twice
| in two different ways across the project.
|
| `dueLabel` is deliberately not used here: it speaks relative time ("Due in
| 2 days"), which is correct on a screen that re-renders and wrong in a
| notification, which is read once and then sits in the list saying the same
| sentence a week later.
*/

const dueText = (dueDate) =>
  dueDate
    ? `Due ${formatDate(dueDate)}.`
    : "No due date.";


/*
| Who did it, in words. `actionUser.name` is the same display name that goes
| into `createdBy` and onto every activity line, so a task cannot be shown
| as assigned by one name and moved by another.
*/

const actorName = (actionUser) =>
  actionUser?.name || "Someone";


/*
|--------------------------------------------------------------------------
| Task Assigned
|--------------------------------------------------------------------------
| Sent when a task is created for somebody.
|
| A self created task announces nothing: `tasks.createOwn` is the permission
| an employee actually has, so most tasks an employee raises are their own,
| and the guard in `notifyRecipient` catches every one of them without the
| caller having to know that.
|
| The creator's name is taken from the task when it carries one — `createTask`
| writes `createdBy` as the display name — and falls back to the actor, which
| is the same person at create time. Nothing is read from Firebase for this.
*/

export const notifyTaskAssigned = async (
  companyCode,
  task,
  actionUser
) => {

  const creatorName =
    task?.createdBy ||
    actorName(actionUser);

  await notifyRecipient(
    companyCode,
    task?.assignedTo,
    actionUser,
    {
      ...taskDefaults(task),

      event:
        NOTIFICATION_EVENTS.TASK_ASSIGNED,

      title: "New Task Assigned",

      message:
        `${creatorName} assigned you "${task?.title || "a task"}". ${dueText(task?.dueDate)}`,
    }
  );

};


/*
|--------------------------------------------------------------------------
| Task Reassigned
|--------------------------------------------------------------------------
| Sent when an edit moves a task from one employee to another. Both sides
| are told, and they are told different things:
|
|   the new assignee gets the same actionable "New Task Assigned" the create
|   path sends, because from where they sit nothing distinguishes the two;
|
|   the previous assignee gets an informational line, because work that
|   silently disappears off somebody's list is worse than work that arrives.
|
| Either side is dropped if it is the actor — HR moving a task off itself is
| not news to HR — and the previous assignee is dropped when there wasn't
| one, which is how an unassigned task being given an owner stays a plain
| assignment.
|
| The new assignee's name is read from the directory: an edit carries ids,
| not names, and telling somebody their task went to "WV004" is not telling
| them anything.
*/

export const notifyTaskReassigned = async (
  companyCode,
  task,
  previousAssignedTo,
  actionUser
) => {

  const newAssigneeName =
    await getEmployeeName(
      companyCode,
      task?.assignedTo
    ) ||
    task?.assignedTo ||
    "another employee";

  await Promise.all([

    notifyRecipient(
      companyCode,
      task?.assignedTo,
      actionUser,
      {
        ...taskDefaults(task),

        event:
          NOTIFICATION_EVENTS.TASK_ASSIGNED,

        title: "New Task Assigned",

        message:
          `${actorName(actionUser)} assigned you "${task?.title || "a task"}". ${dueText(task?.dueDate)}`,
      }
    ),

    notifyRecipient(
      companyCode,
      previousAssignedTo,
      actionUser,
      {
        ...taskDefaults(task),

        event:
          NOTIFICATION_EVENTS.TASK_REASSIGNED,

        title: "Task Reassigned",

        message:
          `"${task?.title || "A task"}" has been reassigned to ${newAssigneeName}.`,
      }
    ),

  ]);

};


/*
|--------------------------------------------------------------------------
| Task Updated
|--------------------------------------------------------------------------
| Sent to the assignee when an edit changes something they need to act on.
|
| Which fields those are is decided here rather than by the caller, and the
| list is short on purpose: a due date, a priority and a title are the three
| things that change what somebody does next. A description reworded for
| clarity is not, and notifying on it would train everybody to ignore the
| bell — so a description-only edit writes nothing at all.
|
| Assignment is not handled here either. An edit that moves the task belongs
| to `notifyTaskReassigned`, which says something more useful than "updated".
|
| The changed fields are named in the message, because "Task Updated" on its
| own sends the reader to the board to find out what for.
*/

const UPDATE_LABELS = {

  dueDate: (task) =>
    task?.dueDate
      ? `Due date moved to ${formatDate(task.dueDate)}`
      : "Due date removed",

  priority: (task) =>
    `Priority set to ${task?.priority || "Medium"}`,

  title: () =>
    "Title changed",

};

export const notifyTaskUpdated = async (
  companyCode,
  task,
  previousTask,
  actionUser
) => {

  /*
  | No previous copy means nothing can be compared, and a notification that
  | cannot name its change is the one this function exists to avoid. Silence
  | is the safe answer: an older call site can never spam the assignee.
  */

  if (!previousTask) {
    return;
  }

  const changes = Object.keys(UPDATE_LABELS)
    .filter(
      (field) =>
        task?.[field] !== previousTask?.[field]
    )
    .map(
      (field) =>
        UPDATE_LABELS[field](task)
    );

  if (!changes.length) {
    return;
  }

  await notifyRecipient(
    companyCode,
    task?.assignedTo,
    actionUser,
    {
      ...taskDefaults(task),

      event:
        NOTIFICATION_EVENTS.TASK_UPDATED,

      title: "Task Updated",

      message:
        `${actorName(actionUser)} updated "${task?.title || "a task"}". ${changes.join(". ")}.`,
    }
  );

};


/*
|--------------------------------------------------------------------------
| Task Status Changed
|--------------------------------------------------------------------------
| Sent to the person who raised the task, so they learn what became of the
| work they handed out.
|
| The assignee is not told: they are the one who moved it. The guard covers
| the ordinary case anyway — an employee's own task is one where creator and
| assignee are the same person, so their own progress never reaches them.
|
| Every status is accepted here. Which ones are worth announcing is the
| caller's decision, and the plan narrows it to `Completed`: a task walked
| through To Do → In Progress → Paused → In Progress would otherwise ping
| its creator four times for one afternoon's work. Keeping the service
| permissive means that decision can be revisited without touching this file.
|
| Auto-paused tasks must never come through here. Those are the same
| employee's other work being stopped by their own click, and the write that
| stops them is a side effect of the status change, not a status change
| anybody chose.
*/

export const notifyTaskStatusChanged = async (
  companyCode,
  task,
  status,
  actionUser
) => {

  await notifyRecipient(
    companyCode,
    task?.createdById,
    actionUser,
    {
      ...taskDefaults(task),

      event:
        NOTIFICATION_EVENTS.TASK_STATUS_CHANGED,

      title: `Task ${status}`,

      /*
      | Finishing something is worth saying plainly. "moved to Completed"
      | is how the board describes it and how every other status has to be
      | described, but it is not how a person would tell you, and this is
      | the one status somebody was actually waiting to hear about.
      */
      message:
        status === COMPLETED_STATUS
          ? `${actorName(actionUser)} completed "${task?.title || "a task"}".`
          : `${actorName(actionUser)} moved "${task?.title || "a task"}" to ${status}.`,
    }
  );

};


/*
|--------------------------------------------------------------------------
| Due Today / Overdue
|--------------------------------------------------------------------------
| The only two events nobody triggers. A task falling due is time passing,
| not somebody clicking, and this project has no server, no scheduler and
| no Cloud Functions to notice it — so the list already open in somebody's
| browser is what notices instead.
|
| That has one consequence worth stating plainly: these arrive when a task
| screen is next opened, not at midnight. For a due-date reminder that is
| honest enough — somebody has to be looking at the app to act on it anyway
| — but it is a client sweep, not a cron, and should not be described as one.
|
| Whoever runs the sweep writes for whoever is assigned, so no actor is
| passed. That is deliberate, and it is the one place the self guard is
| left idle on purpose: here the assignee IS the recipient, and handing in
| the signed in user as the actor would suppress exactly the notification
| the feature exists to send. The list handed in is already the role's own
| (`filterOwnTasks`, or everything under `tasks.viewAll`), so an employee's
| sweep only ever covers their own work.
|
| Everything is compared as "YYYY-MM-DD" strings against `todayInputValue()`,
| the same local-midnight helper the boards and `isOverdue` already use. No
| Date arithmetic and no UTC, so no day-off-by-one.
*/

/*
| What this task owes, if anything. `null` means say nothing, and that is
| the answer for most tasks most of the time:
|
|   no assignee      nobody to tell
|   no due date      nothing to be late for
|   completed        finished work is neither due nor late
|   already told     the marker on the record says so
|
| Due-today is keyed by the date it was sent, so it cannot repeat within a
| day. Overdue is answered by the marker merely existing: once per task,
| ever. A date that has passed does not become more useful by being
| repeated every morning.
*/

const dueNotice = (task, today) => {

  if (
    !task?.id ||
    !task?.assignedTo ||
    !task?.dueDate ||
    task.status === COMPLETED_STATUS
  ) {
    return null;
  }

  if (task.dueDate === today) {

    if (task[TASK_NOTIFIED_FIELDS.DUE_TODAY] === today) {
      return null;
    }

    return {
      field: TASK_NOTIFIED_FIELDS.DUE_TODAY,
      value: today,
      event: NOTIFICATION_EVENTS.TASK_DUE_TODAY,
      title: "Task Due Today",
      message: `"${task.title || "A task"}" is due today.`,
    };

  }

  if (isOverdue(task, today)) {

    if (task[TASK_NOTIFIED_FIELDS.OVERDUE]) {
      return null;
    }

    return {
      field: TASK_NOTIFIED_FIELDS.OVERDUE,
      value: today,
      event: NOTIFICATION_EVENTS.TASK_OVERDUE,
      title: "Task Overdue",
      message: `"${task.title || "A task"}" was due on ${formatDate(task.dueDate)}.`,
    };

  }

  return null;

};


/*
| One pass over a list that is already in memory. Nothing is read from
| Firebase: the markers ride along on the very task records the board is
| already subscribed to, so the check costs nothing.
|
| The marker is written before the notification rather than after. Either
| order can lose something if the second write fails — this one loses a
| single reminder, the other loses the guard, and every reload from then on
| repeats the same line. A missed reminder is recoverable; a bell that
| repeats itself is why people stop reading bells.
|
| A task that fails is stepped over instead of taking the rest of the sweep
| with it, so the caller has nothing to catch.
*/

export const sweepTaskDueNotifications = async (
  companyCode,
  tasks = [],
  today = todayInputValue()
) => {

  if (!companyCode || !tasks.length) {
    return;
  }

  const pending = tasks
    .map((task) => ({
      task,
      notice: dueNotice(task, today),
    }))
    .filter(({ notice }) => notice);

  if (!pending.length) {
    return;
  }

  await Promise.all(

    pending.map(async ({ task, notice }) => {

      try {

        await markTaskDueNotified(
          companyCode,
          task,
          notice.field,
          notice.value
        );

        await notifyRecipient(
          companyCode,
          task.assignedTo,
          null,
          {
            ...taskDefaults(task),

            event: notice.event,

            title: notice.title,

            message: notice.message,
          }
        );

      } catch (notificationError) {

        console.error(
          "Task due notification failed:",
          notificationError
        );

      }

    })

  );

};
