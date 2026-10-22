const db = require("../config/firebase");

function fail(message, statusCode = 400, code = "BAD_REQUEST") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

function companyRoot(companyCode) {
  if (!companyCode || typeof companyCode !== "string") {
    fail("A valid company code is required.", 400);
  }
  return `companies/${companyCode}`;
}

const YEAR_KEY = /^\d{4}$/;

const isTaskNode = (value) =>
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("title" in value || "status" in value ||
        "createdAt" in value);

function flattenRun(run){
  const tasks = new Map();

  const addTask = (id, task) => {
    if(!id || !isTaskNode(task))
      return ;
    if(!tasks.has(id)) tasks.set(id, {...task, id});
  };
  Object.entries(run || {}).forEach(([key, value]) => 
  {
    if(isTaskNode(value)){
      addTask(key, value);
      return;
    }
    if(key === "undated"){
      Object.entries(value || {})
      .forEach(([id, task]) => addTask(id, task));
      return;
    }
        if (YEAR_KEY.test(key)) {
      const yearNode = value || {};
      Object.keys(yearNode).forEach((monthName) => {
        const monthNode = yearNode[monthName] || {};
        Object.keys(monthNode).forEach((dayKey) => {
          const dayNode = monthNode[dayKey] || {};
          Object.entries(dayNode).forEach(([id, task]) =>
            addTask(id, task)
          );
        });
      });
    }
  });
  return [...tasks.values()].sort(
    (a,b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
}
async function getTasks(companyCode, user){
  const snapshot = await db  
  .ref(`${companyRoot(companyCode)}/tasks/run`)
  .once("value");

  const all = flattenRun(snapshot.val());
  const role = user?.role || "";

  if(role === "owner" || role === "hr" || role ==="manager"){
    return all;
  }
  const employeeId = user?.employeeId || "";
  if(!employeeId)
    return [];

  return all.filter((task) => task.assignedTo === employeeId);
}

const roleAccessService = require("./roleAccessService");
const { hasPermission } = require("../utils/permissions");
const {
  getDateKey,
  getMonthPath,
} = require("../utils/attendanceDate");

const DEFAULT_TASK_STATUS = "To Do";
const TASK_PRIORITIES = ["Low", "Medium", "High"];
const DEFAULT_PRIORITY = "Medium";
const TITLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,'()\-/&]{4,99}$/;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UNDATED_NODE = "undated";


function taskBucket(dateKey) {
  const monthPath = getMonthPath(dateKey);
  return monthPath ? `${monthPath}/${dateKey}` : UNDATED_NODE;
}

function validateTaskPayload(payload) {
  const title = String(payload?.title ?? "").trim();
  if (!TITLE_PATTERN.test(title)) {
    fail("Task title must be 5-100 characters.", 400);
  }
    const description = String(payload?.description ?? "");
  if (!description.trim()) {
    fail("Description is required.", 400);
  }
  if (description.length > 500) {
    fail("Description cannot exceed 500 characters.", 400);
  }

const dueDate = String(payload?.dueDate ?? "").trim();
  if (!DATE_KEY_PATTERN.test(dueDate)) {
    fail("Please select a valid due date.", 400);
  }
  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  if (
    due.getFullYear() !== year ||
    due.getMonth() !== month - 1 ||
    due.getDate() !== day
  ) {
    fail("Please select a valid due date.", 400);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due < today) {
    fail("Due date cannot be in the past.", 400);
  }

  const priority = TASK_PRIORITIES.includes(payload?.priority)
    ? payload.priority
    : DEFAULT_PRIORITY;

  return { title, description: description.trim(), dueDate, priority };
}
async function actorName(companyCode, role, actorId) {
  if (role !== "owner") {
    const snapshot = await db
      .ref(`companies/${companyCode}/employees/${actorId}/personalInfo/name`)
      .once("value");
    return snapshot.val() || actorId;
  }
  const snapshot = await db
    .ref(`companies/${companyCode}/details`)
    .once("value");
  const details = snapshot.val() || {};
  return details.ownerName || details.name || "Admin";
}

async function createTask({ companyCode, user, payload }) {
  const role = user?.role || "";
  const actorId =
    role === "owner" ? "owner" : String(user?.employeeId || "").trim();

  if (!actorId) {
    fail("Cannot create a task without a signed-in user.", 401, "UNAUTHORIZED");
  }

  const { title, description, dueDate, priority } =
    validateTaskPayload(payload);

      // Assignee maujood hona chahiye, warna galat ID par task latak jayega
  let assignedTo = String(payload?.assignedTo ?? "").trim();
  if (!assignedTo) {
    fail("Please select an employee.", 400);
  }
  const assigneeSnap = await db
    .ref(`${companyRoot(companyCode)}/employees/${assignedTo}`)
    .once("value");
  if (!assigneeSnap.exists()) {
    fail("Selected employee does not exist.", 400);
  }
 // Sirf createOwn wala apne liye hi bana sakta hai — token se force
  const stored = await roleAccessService.getRoleAccessForRole(
    companyCode,
    role
  );
  if (role !== "owner" && !hasPermission(stored, role, "tasks.create")) {
    assignedTo = actorId;
  }

  const now = Date.now();
  const taskId = db
    .ref(`${companyRoot(companyCode)}/tasks/run`)
    .push().key;
  const bucket = taskBucket(getDateKey(now));

  const newTask = {
    title,
    description,
    assignedTo,
    dueDate,
    priority,
    status: DEFAULT_TASK_STATUS,
    createdAt: now,
    updatedAt: now,
    createdBy: await actorName(companyCode, role, actorId),
    createdById: actorId,
  };

  await db
    .ref(`${companyRoot(companyCode)}/tasks/run/${bucket}/${taskId}`)
    .set(newTask);

  return { status: 201, task: { id: taskId, ...newTask } };
}
const TASK_STATUSES = ["To Do", "In Progress", "Paused", "Completed"];
const IN_PROGRESS_STATUS = "In Progress";
const PAUSED_STATUS = "Paused";

// Firebase key me . # $ [ ] / nahi chalte
const sanitizeKey = (value) =>
  String(value || "").replace(/[.#$[\]/]/g, "_");
// run scan karke task + uska khaana (bucket) — likhne ke liye chahiye
function findTaskInRun(run, taskId) {
  let found = null;

  const visit = (id, task, bucket) => {
    if (found || !id || !isTaskNode(task)) return;
    if (id === taskId) found = { task: { ...task, id }, bucket };
  };
  Object.entries(run || {}).forEach(([key, value]) => {
    if (isTaskNode(value)) {
      visit(key, value, "");
      return;
    }
    if (key === "undated") {
      Object.entries(value || {}).forEach(([id, task]) =>
        visit(id, task, "undated")
      );
      return;
    }
    if (YEAR_KEY.test(key)) {
      Object.entries(value || {}).forEach(([month, days]) =>
        Object.entries(days || {}).forEach(([day, node]) => {
          const bucket = `${key}/${month}/${day}`;
          Object.entries(node || {}).forEach(([id, task]) =>
            visit(id, task, bucket)
          );
        })
      );
    }
  });
  return found;
}

function listRunWithBuckets(run) {
  const list = [];
const visit = (id, task, bucket) => {
    if (!id || !isTaskNode(task)) return;
    if (list.some((item) => item.task.id === id)) return;
    list.push({ task: { ...task, id }, bucket });
  };

  Object.entries(run || {}).forEach(([key, value]) => {
    if (isTaskNode(value)) {
      visit(key, value, "");
      return;
    }
    if (key === "undated") {
      Object.entries(value || {}).forEach(([id, task]) =>
        visit(id, task, "undated")
      );
      return;
    }
        if (YEAR_KEY.test(key)) {
      Object.entries(value || {}).forEach(([month, days]) =>
        Object.entries(days || {}).forEach(([day, node]) => {
          const bucket = `${key}/${month}/${day}`;
          Object.entries(node || {}).forEach(([id, task]) =>
            visit(id, task, bucket)
          );
        })
      );
    }
  });

  return list;
}
async function updateTaskStatus({ companyCode, user, taskId, status }) {
  if (!TASK_STATUSES.includes(status)) {
    fail("Invalid task status.", 400);
  }

  const role = user?.role || "";
  const actorId =
    role === "owner" ? "owner" : String(user?.employeeId || "").trim();
  if (!actorId) {
    fail("Cannot update a task without a signed-in user.", 401, "UNAUTHORIZED");
  }
    const snapshot = await db
    .ref(`${companyRoot(companyCode)}/tasks/run`)
    .once("value");
  const found = findTaskInRun(snapshot.val(), taskId);
  if (!found) {
    fail("Task not found.", 404, "NOT_FOUND");
  }
  const { task, bucket } = found;

  // update haq, warna updateOwn + khud ka banaya hua
  const stored = await roleAccessService.getRoleAccessForRole(
    companyCode,
    role
  );

  const canUpdateAll =
    role === "owner" || hasPermission(stored, role, "tasks.update");
  const isCreator = task.createdById === actorId;
  if (
    !canUpdateAll &&
    !(hasPermission(stored, role, "tasks.updateOwn") && isCreator)
  ) {
    fail("You do not have permission to update this task.", 403);
  }

  const fromStatus = task.status || "To Do";
  if (fromStatus === status) {
    return { status: 200, changed: false, paused: [] };
  }

  const now = Date.now();
  const actionKey = sanitizeKey(actorId);
  const actionBy = await actorName(companyCode, role, actorId);
  const rel = bucket ? `run/${bucket}/${taskId}` : `run/${taskId}`;

  const updates = {};
  updates[`${rel}/status`] = status;
  updates[`${rel}/updatedAt`] = now;
  updates[`records/${taskId}/activity/${actionKey}/${now}`] = {
    type: "status_changed",
    fromStatus,
    toStatus: status,
    actionBy,
  };

  // Ek assignee, ek waqt par ek hi In Progress — baaki auto-pause
  const paused = [];
  if (status === IN_PROGRESS_STATUS && task.assignedTo) {
    const all = listRunWithBuckets(snapshot.val());
    for (const sib of all) {
      if (sib.task.id === taskId) continue;
      if (sib.task.assignedTo !== task.assignedTo) continue;
      if (sib.task.status !== IN_PROGRESS_STATUS) continue;

      const sibRel = sib.bucket
        ? `run/${sib.bucket}/${sib.task.id}`
        : `run/${sib.task.id}`;
      updates[`${sibRel}/status`] = PAUSED_STATUS;
      updates[`${sibRel}/updatedAt`] = now;
      updates[`records/${sib.task.id}/activity/${actionKey}/${now}`] = {
        type: "auto_paused",
        fromStatus: sib.task.status,
        toStatus: PAUSED_STATUS,
        actionBy,
        auto: true,
        message: `Paused automatically when "${
          task.title || "another task"
        }" was started`,
      };
      paused.push(sib.task.title || sib.task.id);
    }
  }

  await db.ref(`${companyRoot(companyCode)}/tasks`).update(updates);

  return { status: 200, changed: true, paused };
}
const EDITABLE_FIELDS = [
  "title",
  "description",
  "assignedTo",
  "dueDate",
  "priority",
];

async function updateTask({ companyCode, user, taskId, payload }) {
  const role = user?.role || "";
  const actorId =
    role === "owner" ? "owner" : String(user?.employeeId || "").trim();
  if (!actorId) {
    fail("Cannot update a task without a signed-in user.", 401, "UNAUTHORIZED");
  }

  const snap = await db
    .ref(`${companyRoot(companyCode)}/tasks/run`)
    .once("value");
  const found = findTaskInRun(snap.val(), taskId);
  if (!found) {
    fail("Task not found.", 404, "NOT_FOUND");
  }
  const { task, bucket } = found;

  // update haq, warna updateOwn + khud ka banaya hua
  const stored = await roleAccessService.getRoleAccessForRole(
    companyCode,
    role
  );
  const canUpdateAll =
    role === "owner" || hasPermission(stored, role, "tasks.update");
  const isCreator = task.createdById === actorId;
  if (
    !canUpdateAll &&
    !(hasPermission(stored, role, "tasks.updateOwn") && isCreator)
  ) {
    fail("You do not have permission to update this task.", 403);
  }

  // Sirf bheje gaye editable fields validate + collect (status yaha kabhi nahi)
  const updates = {};
  if (payload?.title !== undefined) {
    const title = String(payload.title).trim();
    if (!TITLE_PATTERN.test(title)) {
      fail("Task title must be 5-100 characters.", 400);
    }
    updates.title = title;
  }
  if (payload?.description !== undefined) {
    const description = String(payload.description);
    if (!description.trim()) {
      fail("Description is required.", 400);
    }
    if (description.length > 500) {
      fail("Description cannot exceed 500 characters.", 400);
    }
    updates.description = description.trim();
  }
  if (payload?.assignedTo !== undefined) {
    const assignedTo = String(payload.assignedTo).trim();
    if (!assignedTo) {
      fail("Please select an employee.", 400);
    }
    const assigneeSnap = await db
      .ref(`${companyRoot(companyCode)}/employees/${assignedTo}`)
      .once("value");
    if (!assigneeSnap.exists()) {
      fail("Selected employee does not exist.", 400);
    }
    updates.assignedTo = assignedTo;
  }
  if (payload?.dueDate !== undefined) {
    const dueDate = String(payload.dueDate).trim();
    if (!DATE_KEY_PATTERN.test(dueDate)) {
      fail("Please select a valid due date.", 400);
    }
    const [year, month, day] = dueDate.split("-").map(Number);
    const due = new Date(year, month - 1, day);
    if (
      due.getFullYear() !== year ||
      due.getMonth() !== month - 1 ||
      due.getDate() !== day
    ) {
      fail("Please select a valid due date.", 400);
    }
    // Badli hi nahi to past-check skip (frontend edit jaisa)
    if (dueDate !== task.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) {
        fail("Due date cannot be in the past.", 400);
      }
    }
    updates.dueDate = dueDate;
  }
  if (payload?.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(payload.priority)) {
      fail("Invalid task priority.", 400);
    }
    updates.priority = payload.priority;
  }

  updates.updatedAt = Date.now();

  const rel = bucket ? `run/${bucket}/${taskId}` : `run/${taskId}`;
  await db.ref(`${companyRoot(companyCode)}/tasks/${rel}`).update(updates);

  return { status: 200, task: { ...task, ...updates, id: taskId } };
}

async function deleteTask({ companyCode, user, taskId }) {
  const snap = await db
    .ref(`${companyRoot(companyCode)}/tasks/run`)
    .once("value");
  const found = findTaskInRun(snap.val(), taskId);
  if (!found) {
    fail("Task not found.", 404, "NOT_FOUND");
  }

  const { bucket } = found;
  const rel = bucket ? `run/${bucket}/${taskId}` : `run/${taskId}`;

  // Task + uski history ek saath (anaath activity na chhoote)
  const updates = {};
  updates[rel] = null;
  updates[`records/${taskId}`] = null;
  await db.ref(`${companyRoot(companyCode)}/tasks`).update(updates);

  return { status: 200, deleted: true };
}

async function getTaskActivity({ companyCode, user, taskId }) {
  const role = user?.role || "";
  const employeeId =
    role === "owner" ? "owner" : String(user?.employeeId || "").trim();

  const snap = await db
    .ref(`${companyRoot(companyCode)}/tasks/run`)
    .once("value");
  const found = findTaskInRun(snap.val(), taskId);
  if (!found) {
    fail("Task not found.", 404, "NOT_FOUND");
  }
  const stored = await roleAccessService.getRoleAccessForRole(
    companyCode,
    role
  );
  const canViewAll =
    role === "owner" || hasPermission(stored, role, "tasks.viewAll");
  if (!canViewAll && found.task.assignedTo !== employeeId) {
    fail("You do not have permission to view this task.", 403);
  }
  const activitySnap = await db
    .ref(`${companyRoot(companyCode)}/tasks/records/${taskId}/activity`)
    .once("value");

  return { status: 200, activity: activitySnap.val() || {} };
}
module.exports = {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
deleteTask,
getTaskActivity
};

