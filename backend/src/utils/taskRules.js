/*
|--------------------------------------------------------------------------
| Task Rules
|--------------------------------------------------------------------------
| Tasks ke saare pure niyam — koi Firebase nahi, koi request nahi. Andar jo
| diya usi se jawab. Isliye service, subtask service aur tests teeno yahi
| ek jagah padhte hain, aur niyam kabhi do jagah alag nahi hote.
|
| attendanceRules.js jaisa hi: service "kab" aur "kahan" tay karti hai,
| ye file "kya sahi hai".
|--------------------------------------------------------------------------
*/

const TASK_STATUSES = ["To Do", "In Progress", "Paused", "Completed"];
const DEFAULT_TASK_STATUS = TASK_STATUSES[0];
const IN_PROGRESS_STATUS = TASK_STATUSES[1];
const PAUSED_STATUS = TASK_STATUSES[2];
const COMPLETED_STATUS = TASK_STATUSES[3];

/*
| Step (subtask) ke status. Status hi timer hai: In Progress par waqt chalta
| hai, Paused / Done / To Do par rukta hai — alag Start/Stop button nahi.
| Purane steps par status nahi, sirf done hai — subtaskStatusOf wahi samjhata hai.
*/
const SUBTASK_STATUSES = ["To Do", "In Progress", "Paused", "Done"];
const SUBTASK_TODO = SUBTASK_STATUSES[0];
const SUBTASK_IN_PROGRESS = SUBTASK_STATUSES[1];
const SUBTASK_PAUSED = SUBTASK_STATUSES[2];
const SUBTASK_DONE = SUBTASK_STATUSES[3];

const subtaskStatusOf = (subtask) =>
  SUBTASK_STATUSES.includes(subtask?.status)
    ? subtask.status
    : subtask?.done
      ? SUBTASK_DONE
      : SUBTASK_TODO;

// Andaza minute mein — 1 minute se 200 ghante tak
const ESTIMATE_LIMIT_MINUTES = 200 * 60;

const TASK_PRIORITIES = ["Low", "Medium", "High"];
const DEFAULT_PRIORITY = "Medium";

const TITLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'()\-/&]{4,99}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DESCRIPTION_LIMIT = 500;
const SUBTASK_TITLE_LIMIT = 150;

// Ek task par kitne log — isse zyada ho to wo team nahi, department hai
const MEMBER_LIMIT = 20;
const SUBTASK_LIMIT = 50;

const ROLE = Object.freeze({
  OWNER: "owner",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee",
});

/*
| Kaun kisko task (ya subtask) nahi de sakta. Pehle ye sirf AllTasks.jsx mein
| tha, isliye API seedha bulane par koi rok nahi thi. Ab server isi se
| chalta hai; page wala list sirf dropdown chhantne ke liye hai.
|
| Owner is list mein hai hi nahi — uspar koi rok nahi. Apne aap ko har koi
| de sakta hai, wo chhoot isAssignableRole mein alag se hai.
*/
const BLOCKED_ASSIGNEE_ROLES = {
  [ROLE.HR]: [ROLE.HR, ROLE.MANAGER],
  [ROLE.MANAGER]: [ROLE.MANAGER],
  [ROLE.EMPLOYEE]: [ROLE.HR],
};

const ACTIVITY_TYPE = Object.freeze({
  STATUS_CHANGED: "status_changed",
  AUTO_PAUSED: "auto_paused",
  WORK_STARTED: "work_started",
  WORK_STOPPED: "work_stopped",
  SUBTASK_STATUS: "subtask_status",
  TASK_UPDATED: "task_updated",
  SUBTASK_ADDED: "subtask_added",
  SUBTASK_UPDATED: "subtask_updated",
  SUBTASK_COMPLETED: "subtask_completed",
  SUBTASK_REOPENED: "subtask_reopened",
  SUBTASK_REMOVED: "subtask_removed",
  ARCHIVED: "archived",
  RESTORED: "restored",
});

const normalizeId = (value) => String(value ?? "").trim();

/* ── Validation ── */

const validateTitle = (value) => {
  const title = String(value ?? "").trim();
  return TITLE_PATTERN.test(title)
    ? { value: title }
    : { error: "Task title must be 5-100 characters." };
};

const validateDescription = (value) => {
  const description = String(value ?? "");
  if (!description.trim()) return { error: "Description is required." };
  if (description.length > DESCRIPTION_LIMIT) {
    return { error: `Description cannot exceed ${DESCRIPTION_LIMIT} characters.` };
  }
  return { value: description.trim() };
};

/*
| "YYYY-MM-DD" asli taareekh hai ya nahi, aur aaj se pehle to nahi.
|
| today bahar se aata hai (company timezone ka din) — pehle yahan server ki
| ghadi ka new Date() tha, aur UTC server par raat 12 se 5:30 tak India ka
| "aaj" server ke liye "kal" hota tha.
*/
const validateDueDate = (value, today, { allowPast = false } = {}) => {
  const dueDate = String(value ?? "").trim();

  if (!DATE_KEY_PATTERN.test(dueDate)) {
    return { error: "Please select a valid due date." };
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: "Please select a valid due date." };
  }

  if (!allowPast && dueDate < today) {
    return { error: "Due date cannot be in the past." };
  }

  return { value: dueDate };
};

const validatePriority = (value, { strict = false } = {}) => {
  if (TASK_PRIORITIES.includes(value)) return { value };
  return strict ? { error: "Invalid task priority." } : { value: DEFAULT_PRIORITY };
};

/* ── Team ── */

/*
| members Firebase mein { EMP01: true } hai (array nahi) — do log ek saath
| jodein to ek doosre ko overwrite na karein. Owner (assignedTo) kabhi
| members mein nahi rehta; wo alag field hai, purane tasks jaisa.
*/
const memberIdsOf = (task) =>
  Object.keys(task?.members || {}).filter(
    (id) => id && id !== task?.assignedTo
  );

const teamOf = (task) =>
  [...new Set([task?.assignedTo, ...memberIdsOf(task)].filter(Boolean))];

const isOnTask = (task, employeeId) =>
  Boolean(employeeId) && teamOf(task).includes(employeeId);

/*
| Abhi kaun is task par kaam kar raha hai.
|
| Naye tasks par working/{employeeId} likha hota hai. Purane In Progress
| tasks par ye node hai hi nahi — unke liye pehle jaisa matlab: owner kaam
| kar raha hai. Isse koi migration nahi chahiye.
*/
const workingIdsOf = (task) => {
  if (task?.working && typeof task.working === "object") {
    return Object.keys(task.working);
  }

  return task?.status === IN_PROGRESS_STATUS && task?.assignedTo
    ? [task.assignedTo]
    : [];
};

const isWorkingOn = (task, employeeId) =>
  Boolean(employeeId) && workingIdsOf(task).includes(employeeId);

/*
| Members ki list saaf karo: khaali, duplicate aur owner hatao. Owner ko
| member banana bekaar hai — wo pehle se task ka hai.
*/
const cleanMemberList = (ids, ownerId) =>
  [...new Set((Array.isArray(ids) ? ids : []).map(normalizeId))].filter(
    (id) => id && id !== ownerId
  );

/* ── Who can assign whom ── */

const isAssignableRole = (actorRole, targetRole, isSelf) => {
  if (isSelf) return true;
  const blocked = BLOCKED_ASSIGNEE_ROLES[actorRole] || [];
  // Khaali role kabhi match nahi karta — blank role wala employee pehle ki
  // tarah dropdown mein rehta hai
  return !blocked.includes(targetRole);
};

/* ── Permissions on one task ── */

/*
| ctx: { role, actorId, can(path) } — taskStore.loadActor() se banta hai.
| Owner ke liye can() hamesha true.
*/

const canViewAll = (ctx) => ctx.can("tasks.viewAll");

const canSeeTask = (ctx, task) =>
  canViewAll(ctx) ||
  isOnTask(task, ctx.actorId) ||
  (Boolean(ctx.actorId) && task?.createdById === ctx.actorId);

const canEditAll = (ctx) => ctx.can("tasks.update");

const isCreatorOf = (ctx, task) =>
  Boolean(ctx.actorId) && task?.createdById === ctx.actorId;

// Title, description, due date, priority, owner — task ki "details"
const canEditDetails = (ctx, task) =>
  canEditAll(ctx) || (ctx.can("tasks.updateOwn") && isCreatorOf(ctx, task));

/*
| Status — yahi pehle toota hua tha: sirf creator badal sakta tha, to jise
| HR ne task diya wo employee apna hi kaam "In Progress" nahi kar paata tha.
| Ab jo bhi task par hai (owner ya member) wo status badal sakta hai.
*/
const canChangeStatus = (ctx, task) =>
  canEditDetails(ctx, task) || isOnTask(task, ctx.actorId);

/*
| Team mein log jodna/hatana — doosron ko kaam dena hai, isliye
| tasks.create ka haq chahiye (Employee ke paas default mein nahi). Saath
| mein task edit karne ka haq, ya task ka owner hona.
*/
const canManageMembers = (ctx, task) =>
  ctx.can("tasks.create") &&
  (canEditDetails(ctx, task) || task?.assignedTo === ctx.actorId);

/* ── Subtasks ── */

/*
| managerScope: Manager ke department ke log (getAccessibleEmployeeIds).
| Manager us task par subtask de sakta hai jisme uske department ka koi
| owner ya member ho.
*/
const isInManagerScope = (ctx, task, scopeIds = []) =>
  ctx.role === ROLE.MANAGER &&
  teamOf(task).some((id) => scopeIds.includes(id));

/*
| Steps par "sab tasks" ka haq — Owner aur HR (tasks.update ke saath).
| Manager ke paas bhi default mein tasks.update hai, par steps ke liye uski
| had uska department hai; warna Finance ka manager Operations ke task par
| step daal deta.
*/
const editsAllSteps = (ctx) => ctx.role !== ROLE.MANAGER && canEditAll(ctx);

const canAddSubtask = (ctx, task, scopeIds) =>
  editsAllSteps(ctx) ||
  isOnTask(task, ctx.actorId) ||
  isCreatorOf(ctx, task) ||
  isInManagerScope(ctx, task, scopeIds);

// Subtask ka naam, person, date badalna ya hatana
const canEditSubtask = (ctx, task, subtask, scopeIds) =>
  editsAllSteps(ctx) ||
  (Boolean(ctx.actorId) && subtask?.createdById === ctx.actorId) ||
  task?.assignedTo === ctx.actorId ||
  isCreatorOf(ctx, task) ||
  isInManagerScope(ctx, task, scopeIds);

/*
| Tick lagana — jise step mila wo, ya bina person wala step ho to team ka
| koi bhi. Baaki wahi log jo step edit kar sakte hain.
*/
const canTickSubtask = (ctx, task, subtask, scopeIds) =>
  (Boolean(ctx.actorId) && subtask?.assignedTo === ctx.actorId) ||
  (!subtask?.assignedTo && isOnTask(task, ctx.actorId)) ||
  canEditSubtask(ctx, task, subtask, scopeIds);

/*
| Subtask kisko diya ja sakta hai:
|   - jo pehle se task par hai — hamesha
|   - Owner: koi bhi
|   - HR: koi bhi jo BLOCKED_ASSIGNEE_ROLES mein na ho
|   - Manager: apne department ka koi bhi, doosre Manager ko chhodkar
|   - Employee: sirf task wale log (upar wali pehli line)
|
| targetRole aur scopeIds service laati hai. Nateeja { ok, joins } — joins
| true matlab wo insaan abhi task par nahi hai aur members mein judega.
*/
const subtaskAssigneeCheck = (ctx, task, targetId, targetRole, scopeIds = []) => {
  if (!targetId) return { ok: true, joins: false };

  if (isOnTask(task, targetId)) return { ok: true, joins: false };

  const isSelf = targetId === ctx.actorId;

  if (ctx.role === ROLE.OWNER) return { ok: true, joins: true };

  if (ctx.role === ROLE.HR) {
    return { ok: isAssignableRole(ROLE.HR, targetRole, isSelf), joins: true };
  }

  if (ctx.role === ROLE.MANAGER) {
    const inScope = isSelf || scopeIds.includes(targetId);
    return {
      ok: inScope && isAssignableRole(ROLE.MANAGER, targetRole, isSelf),
      joins: true,
    };
  }

  return { ok: false, joins: false };
};

/*
| Subtasks ki ginti — task ke run record par rakhi jaati hai taaki list
| "2/5" bina subtasks utaare dikha sake. openBy: kis employee ke kitne step
| baaki hain ("2 steps for you").
*/
const subtaskSummary = (subtasks = {}) => {
  const list = Object.values(subtasks || {}).filter(Boolean);
  const openBy = {};

  list.forEach((subtask) => {
    if (!subtask.done && subtask.assignedTo) {
      openBy[subtask.assignedTo] = (openBy[subtask.assignedTo] || 0) + 1;
    }
  });

  return {
    subtaskTotal: list.length,
    subtaskDone: list.filter((subtask) => subtask.done).length,
    // Firebase khaali object store nahi karta — null se field hat jaati hai
    subtaskOpenBy: Object.keys(openBy).length ? openBy : null,
  };
};

const isArchived = (task) => Boolean(task?.archivedAt);

module.exports = {
  TASK_STATUSES,
  DEFAULT_TASK_STATUS,
  IN_PROGRESS_STATUS,
  PAUSED_STATUS,
  COMPLETED_STATUS,
  TASK_PRIORITIES,
  DEFAULT_PRIORITY,
  SUBTASK_STATUSES,
  SUBTASK_TODO,
  SUBTASK_IN_PROGRESS,
  SUBTASK_PAUSED,
  SUBTASK_DONE,
  subtaskStatusOf,
  ESTIMATE_LIMIT_MINUTES,
  DESCRIPTION_LIMIT,
  SUBTASK_TITLE_LIMIT,
  MEMBER_LIMIT,
  SUBTASK_LIMIT,
  ROLE,
  BLOCKED_ASSIGNEE_ROLES,
  ACTIVITY_TYPE,
  validateTitle,
  validateDescription,
  validateDueDate,
  validatePriority,
  memberIdsOf,
  teamOf,
  isOnTask,
  workingIdsOf,
  isWorkingOn,
  cleanMemberList,
  isAssignableRole,
  canViewAll,
  canSeeTask,
  canEditAll,
  canEditDetails,
  canChangeStatus,
  canManageMembers,
  isInManagerScope,
  canAddSubtask,
  canEditSubtask,
  canTickSubtask,
  subtaskAssigneeCheck,
  subtaskSummary,
  isArchived,
};
