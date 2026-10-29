const db = require("../config/firebase");

/*
|--------------------------------------------------------------------------
| Task Notifications (server)
|--------------------------------------------------------------------------
| Pehle ye khabrein browser bhejta tha — API call ke baad page khud
| notification likhta tha. Tab band ho jaye ya net toote to khabar kabhi
| nahi jaati thi. Ab task likhne ke saath server hi bhejta hai.
|
| Shakal bilkul wahi jo frontend ka notificationService.createNotification
| likhta hai, usi path par — bell aur inbox mein kuch nahi badalna padta.
|
|   companies/{code}/notifications/{recipientId}/{pushId}
|
| Har function apni galti khud nigal leta hai: notification fail ho to task
| ka kaam fail nahi hona chahiye.
|--------------------------------------------------------------------------
*/

const EVENTS = Object.freeze({
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_REASSIGNED: "TASK_REASSIGNED",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DUE_TODAY: "TASK_DUE_TODAY",
  TASK_OVERDUE: "TASK_OVERDUE",
});

const createNotification = async (companyCode, recipientId, notification) => {
  const ref = db.ref(`companies/${companyCode}/notifications/${recipientId}`).push();

  await ref.set({
    event: notification.event || "SYSTEM",
    type: "task",
    title: notification.title || "Notification",
    message: notification.message || "",
    entityType: "task",
    entityId: notification.entityId || "",
    route: "/tasks",
    isRead: false,
    createdAt: Date.now(),
    readAt: null,
    createdBy: notification.createdBy || "",
  });
};

/*
| Kai logon ko ek saath. Jisne kaam kiya use uski hi khabar nahi jaati, aur
| ek insaan ko ek hi baar.
*/
const notifyMany = async (companyCode, recipients, actorId, notification) => {
  const unique = [...new Set((recipients || []).filter(Boolean))].filter(
    (id) => id !== actorId
  );

  const results = await Promise.allSettled(
    unique.map((id) =>
      createNotification(companyCode, id, { ...notification, createdBy: actorId || "" })
    )
  );

  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => console.error("Task notification failed:", result.reason));
};

// "2026-08-15" → "Aug 15, 2026" — frontend ka formatDate jaisa
const formatDate = (dateKey) => {
  if (!dateKey) return "";
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

const dueText = (dueDate) => (dueDate ? `Due ${formatDate(dueDate)}.` : "No due date.");

const titleOf = (task) => task?.title || "a task";

const safely = (label, work) =>
  work().catch((error) => console.error(`${label} notification failed:`, error));

/* ── Events ── */

const notifyTaskCreated = (companyCode, task, actor, memberIds = []) =>
  safely("Task created", () =>
    Promise.all([
      notifyMany(companyCode, [task.assignedTo], actor.id, {
        event: EVENTS.TASK_ASSIGNED,
        entityId: task.id,
        title: "New Task Assigned",
        message: `${actor.name} assigned you "${titleOf(task)}". ${dueText(task.dueDate)}`,
      }),
      notifyMany(companyCode, memberIds, actor.id, {
        event: EVENTS.TASK_ASSIGNED,
        entityId: task.id,
        title: "Added to a Task",
        message: `${actor.name} added you to "${titleOf(task)}". ${dueText(task.dueDate)}`,
      }),
    ])
  );

/*
| Edit ke baad — kisko kya batana hai:
|   naya owner          → "assigned you"
|   purana owner        → "reassigned to …"
|   naye members        → "added you"
|   hataye gaye members → "removed you"
|   baaki team          → title / due date / priority badle ho to
*/
const UPDATE_LABELS = {
  dueDate: (task) => `Due date moved to ${formatDate(task.dueDate)}`,
  priority: (task) => `Priority set to ${task.priority || "Medium"}`,
  title: () => "Title changed",
};

const notifyTaskUpdated = (companyCode, { before, after, added = [], removed = [], team = [] }, actor, names = {}) =>
  safely("Task updated", async () => {
    const jobs = [];
    const reassigned = before.assignedTo !== after.assignedTo;

    if (reassigned) {
      jobs.push(
        notifyMany(companyCode, [after.assignedTo], actor.id, {
          event: EVENTS.TASK_ASSIGNED,
          entityId: after.id,
          title: "New Task Assigned",
          message: `${actor.name} assigned you "${titleOf(after)}". ${dueText(after.dueDate)}`,
        }),
        notifyMany(companyCode, [before.assignedTo], actor.id, {
          event: EVENTS.TASK_REASSIGNED,
          entityId: after.id,
          title: "Task Reassigned",
          message: `"${titleOf(after)}" has been reassigned to ${names[after.assignedTo] || after.assignedTo}.`,
        })
      );
    }

    jobs.push(
      notifyMany(companyCode, added, actor.id, {
        event: EVENTS.TASK_ASSIGNED,
        entityId: after.id,
        title: "Added to a Task",
        message: `${actor.name} added you to "${titleOf(after)}". ${dueText(after.dueDate)}`,
      }),
      notifyMany(companyCode, removed, actor.id, {
        event: EVENTS.TASK_UPDATED,
        entityId: after.id,
        title: "Removed from a Task",
        message: `${actor.name} removed you from "${titleOf(after)}".`,
      })
    );

    const changes = Object.keys(UPDATE_LABELS)
      .filter((field) => before[field] !== after[field])
      .map((field) => UPDATE_LABELS[field](after));

    if (changes.length) {
      const skip = new Set([...added, reassigned ? after.assignedTo : ""]);
      jobs.push(
        notifyMany(
          companyCode,
          team.filter((id) => !skip.has(id)),
          actor.id,
          {
            event: EVENTS.TASK_UPDATED,
            entityId: after.id,
            title: "Task Updated",
            message: `${actor.name} updated "${titleOf(after)}". ${changes.join(". ")}.`,
          }
        )
      );
    }

    await Promise.all(jobs);
  });

// Kaam poora hua — jisne diya use aur baaki team ko
const notifyTaskCompleted = (companyCode, task, actor, team = []) =>
  safely("Task completed", () =>
    notifyMany(companyCode, [task.createdById, ...team], actor.id, {
      event: EVENTS.TASK_STATUS_CHANGED,
      entityId: task.id,
      title: "Task Completed",
      message: `${actor.name} completed "${titleOf(task)}".`,
    })
  );

const notifySubtaskAssigned = (companyCode, task, subtask, actor) =>
  safely("Subtask assigned", () =>
    notifyMany(companyCode, [subtask.assignedTo], actor.id, {
      event: EVENTS.TASK_ASSIGNED,
      entityId: task.id,
      title: "New Step Assigned",
      message: `${actor.name} gave you a step on "${titleOf(task)}": ${subtask.title}.${
        subtask.dueDate ? ` Due ${formatDate(subtask.dueDate)}.` : ""
      }`,
    })
  );

// Due job se — koi actor nahi, poori team ko
const notifyDue = (companyCode, task, notice, team = []) =>
  notifyMany(companyCode, team, "", {
    event: notice.event,
    entityId: task.id,
    title: notice.title,
    message: notice.message,
  });

module.exports = {
  EVENTS,
  formatDate,
  notifyTaskCreated,
  notifyTaskUpdated,
  notifyTaskCompleted,
  notifySubtaskAssigned,
  notifyDue,
};
