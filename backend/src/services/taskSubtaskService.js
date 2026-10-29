const db = require("../config/firebase");
const taskStore = require("./taskStore");
const taskTime = require("./taskTime");
const { findVisibleTask, loadVisibleTask, assertNotArchived } = require("./taskService");
const { notifySubtaskAssigned } = require("./taskNotificationService");
const {
  ROLE,
  ACTIVITY_TYPE,
  SUBTASK_TITLE_LIMIT,
  SUBTASK_LIMIT,
  MEMBER_LIMIT,
  validateDueDate,
  teamOf,
  memberIdsOf,
  isAssignableRole,
  canAddSubtask,
  canEditSubtask,
  canTickSubtask,
  subtaskAssigneeCheck,
  subtaskSummary,
  subtaskStatusOf,
  isOnTask,
  workingIdsOf,
  IN_PROGRESS_STATUS,
  PAUSED_STATUS,
  SUBTASK_STATUSES,
  SUBTASK_TODO,
  SUBTASK_IN_PROGRESS,
  SUBTASK_DONE,
  ESTIMATE_LIMIT_MINUTES,
} = require("../utils/taskRules");

const {
  fail,
  todayKey,
  relPath,
  loadActor,
  actorName,
  loadPerson,
  peopleNames,
  managerScopeIds,
  pauseRunningSteps,
  activityKey,
  commit,
} = taskStore;

/*
|--------------------------------------------------------------------------
| Subtasks
|--------------------------------------------------------------------------
| Task ke andar ke chhote kaam (steps). Ye task ke records mein rehte hain,
| run mein nahi — list har page par chalti hai, ye sirf task kholne par
| chahiye.
|
|   tasks/records/{taskId}/subtasks/{subId}
|
| Kaun step jod sakta hai aur kisko de sakta hai — taskRules.js mein. Jise
| step diya wo task par nahi tha, to wo apne aap team mein jud jaata hai,
| warna wo apna step dekh hi nahi paata.
|--------------------------------------------------------------------------
*/

const recordsPath = (companyCode, taskId) =>
  `${taskStore.tasksRoot(companyCode)}/records/${taskId}`;

const readSubtasks = async (companyCode, taskId) => {
  const snapshot = await db
    .ref(`${recordsPath(companyCode, taskId)}/subtasks`)
    .once("value");
  return snapshot.val() || {};
};

const cleanTitle = (value) => {
  const title = String(value ?? "").trim();
  if (!title) fail("Step title is required.", 400);
  if (title.length > SUBTASK_TITLE_LIMIT) {
    fail(`Step title cannot exceed ${SUBTASK_TITLE_LIMIT} characters.`, 400);
  }
  return title;
};

/*
| Andaza (minute). Khaali / 0 matlab andaza nahi. Page ghante bhejta hai to
| bhi minute mein badal kar hi aata hai.
*/
const cleanEstimate = (value) => {
  if (value === undefined || value === null || value === "" || Number(value) === 0) return null;
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > ESTIMATE_LIMIT_MINUTES) {
    fail("Estimate must be between 1 minute and 200 hours.", 400);
  }
  return minutes;
};

/*
| Step Paused / Done / To Do hua ya hata — jo us step par kaam kar rahe the
| unka timer yahin rukta hai (waqt jud jaata hai). Status hi timer hai, to
| step rukne ka matlab kaam rukna.
|
| Task par koi aur laga ho to task In Progress rehta hai; koi na bache to
| task Paused — wahi niyam jo "Stop my work" ka hai.
*/
/*
| Lautata hai true jab is wajah se poora task Paused hua — caller tab task ke
| baaki chalte steps bhi rokta hai (pauseRunningSteps).
*/
const stopWorkOnStep = (updates, current, found, subtaskId, { now, skipSubtask = false }) => {
  const entries = taskTime.sessionsOnTask(current, found.task.id, subtaskId);
  if (!entries.length) return false;

  const { task, bucket } = found;
  const rel = relPath(bucket, task.id);
  const stopped = entries.map((entry) => entry.employeeId);

  entries.forEach((entry) =>
    taskTime.closeSession(updates, entry, { endAt: now, reason: "step", items: [found], skipSubtask })
  );

  const left = workingIdsOf(task).filter((id) => !stopped.includes(id));
  updates[`${rel}/working`] = left.length
    ? Object.fromEntries(left.map((id) => [id, task.working?.[id] || now]))
    : null;

  if (!left.length && task.status === IN_PROGRESS_STATUS) {
    updates[`${rel}/status`] = PAUSED_STATUS;
    return true;
  }

  return false;
};

/*
| Step kisko diya ja sakta hai — jawab ke saath ye bhi ki wo team mein
| judega ya nahi.
*/
const checkAssignee = async (companyCode, ctx, task, targetId, scope) => {
  const person = await loadPerson(companyCode, targetId);
  if (!person) fail("Selected employee does not exist.", 400);

  const result = subtaskAssigneeCheck(ctx, task, targetId, person.role, scope);

  if (!result.ok) {
    fail(`You can't give this step to ${person.name}.`, 403, "FORBIDDEN");
  }

  if (result.joins && memberIdsOf(task).length >= MEMBER_LIMIT) {
    fail(`A task can have at most ${MEMBER_LIMIT} team members.`, 400);
  }

  return result;
};

// Run record par ginti — list "2/5" isi se dikhati hai
const summaryUpdates = (rel, subtasks) => {
  const summary = subtaskSummary(subtasks);
  return {
    [`${rel}/subtaskTotal`]: summary.subtaskTotal || null,
    [`${rel}/subtaskDone`]: summary.subtaskDone || null,
    [`${rel}/subtaskOpenBy`]: summary.subtaskOpenBy,
  };
};

const sortSubtasks = (entries) =>
  entries.sort(
    (a, b) =>
      (a.order || a.createdAt || 0) - (b.order || b.createdAt || 0)
  );

/* ── Subtasks ── */

async function listSubtasks({ companyCode, user, taskId }) {
  // Drawer khulte hi yahi chahiye — jo reads ek doosre par nahi tike, saath mein
  const { ctx, task } = await loadVisibleTask(companyCode, user, taskId);
  const [scope, raw] = await Promise.all([
    managerScopeIds(companyCode, user, ctx),
    readSubtasks(companyCode, task.id),
  ]);

  const subtasks = sortSubtasks(
    Object.entries(raw).map(([id, subtask]) => {
      const status = subtaskStatusOf(subtask);

      return {
        ...subtask,
        id,
        status,
        // Page sirf wahi button dikhata hai jo server maanega
        canTick: canTickSubtask(ctx, task, subtask, scope),
        canEdit: canEditSubtask(ctx, task, subtask, scope),
        // Start: task par ho, step poora na ho, aur step tumhara ya kisi ka nahi
        canStart:
          isOnTask(task, ctx.actorId) &&
          status !== SUBTASK_DONE &&
          (!subtask.assignedTo || subtask.assignedTo === ctx.actorId),
      };
    })
  );

  const people = await peopleNames(
    companyCode,
    subtasks.flatMap((subtask) => [subtask.assignedTo, subtask.createdById, subtask.doneById])
  );

  return {
    status: 200,
    subtasks,
    people,
    canAdd: canAddSubtask(ctx, task, scope),
  };
}

async function addSubtask({ companyCode, user, taskId, payload = {} }) {
  const ctx = await loadActor(companyCode, user);
  const { task, bucket } = await findVisibleTask(companyCode, ctx, taskId);

  assertNotArchived(task);

  const scope = await managerScopeIds(companyCode, user, ctx);

  if (!canAddSubtask(ctx, task, scope)) {
    fail("You do not have permission to add steps to this task.", 403, "FORBIDDEN");
  }

  const title = cleanTitle(payload.title);
  const existing = await readSubtasks(companyCode, task.id);

  if (Object.keys(existing).length >= SUBTASK_LIMIT) {
    fail(`A task can have at most ${SUBTASK_LIMIT} steps.`, 400);
  }

  /*
  | Person na chuna ho to step usi ka jo bana raha hai — agar wo khud task
  | par hai (employee apna kaam todta hai). Manager/HR jo task par nahi,
  | unka step bina person ka rehta hai — team ka koi bhi utha le.
  */
  const assignedTo =
    String(payload.assignedTo ?? "").trim() ||
    (isOnTask(task, ctx.actorId) ? ctx.actorId : "");
  const check = assignedTo
    ? await checkAssignee(companyCode, ctx, task, assignedTo, scope)
    : { joins: false };

  const dueDateInput = String(payload.dueDate ?? "").trim();
  const dueDate = dueDateInput
    ? validateDueDate(dueDateInput, todayKey())
    : { value: "" };
  if (dueDate.error) fail(dueDate.error, 400);

  const estimateMinutes = cleanEstimate(payload.estimateMinutes);

  const now = Date.now();
  const subId = db.ref(`${recordsPath(companyCode, task.id)}/subtasks`).push().key;
  const actionBy = await actorName(companyCode, ctx);
  const rel = relPath(bucket, task.id);

  const subtask = {
    title,
    status: SUBTASK_TODO,
    done: false,
    ...(estimateMinutes ? { estimateMinutes } : {}),
    createdAt: now,
    updatedAt: now,
    order: now,
    createdById: ctx.actorId,
    createdBy: actionBy,
    ...(assignedTo ? { assignedTo } : {}),
    ...(dueDate.value ? { dueDate: dueDate.value } : {}),
  };

  const updates = {
    [`records/${task.id}/subtasks/${subId}`]: subtask,
    ...summaryUpdates(rel, { ...existing, [subId]: subtask }),
    [`${rel}/updatedAt`]: now,
    [`records/${task.id}/activity/${activityKey(ctx.actorId)}/${now}`]: {
      type: ACTIVITY_TYPE.SUBTASK_ADDED,
      actionBy,
      subtaskTitle: title,
      ...(assignedTo ? { targetId: assignedTo } : {}),
      ...(check.joins ? { membersAdded: [assignedTo] } : {}),
    },
  };

  if (check.joins) updates[`${rel}/members/${assignedTo}`] = true;

  await commit(companyCode, updates, now);

  if (assignedTo) {
    await notifySubtaskAssigned(companyCode, task, subtask, { id: ctx.actorId, name: actionBy });
  }

  return { status: 201, subtask: { ...subtask, id: subId }, joined: check.joins };
}

/*
| Field by field likhte hain, poora step object nahi — usi update mein waqt
| ka jod (subtasks/{id}/timeSpent) bhi jaa sakta hai, aur Firebase ek hi
| write mein "step" aur "step/timeSpent" dono nahi maanta.
*/
const STEP_FIELDS = [
  "title",
  "assignedTo",
  "dueDate",
  "estimateMinutes",
  "status",
  "startedAt",
  "done",
  "doneAt",
  "doneById",
  "doneBy",
  "updatedAt",
];

async function updateSubtask({ companyCode, user, taskId, subtaskId, payload = {} }) {
  const ctx = await loadActor(companyCode, user);
  const found = await findVisibleTask(companyCode, ctx, taskId);
  const { task, bucket } = found;

  assertNotArchived(task);

  const existing = await readSubtasks(companyCode, task.id);
  const subtask = existing[subtaskId];

  if (!subtask) fail("Step not found.", 404, "NOT_FOUND");

  // Purana tareeka (done: true/false) bhi chalta hai — status mein badal jaata hai
  let nextStatus = payload.status;
  if (nextStatus === undefined && payload.done !== undefined) {
    nextStatus = payload.done ? SUBTASK_DONE : SUBTASK_TODO;
  }
  if (nextStatus !== undefined && !SUBTASK_STATUSES.includes(nextStatus)) {
    fail("Invalid step status.", 400);
  }

  const scope = await managerScopeIds(companyCode, user, ctx);
  const wantsEdit = ["title", "assignedTo", "dueDate", "estimateMinutes"].some(
    (key) => payload[key] !== undefined
  );
  const wantsStatus = nextStatus !== undefined;

  if (!wantsEdit && !wantsStatus) fail("Nothing to update.", 400);

  if (wantsEdit && !canEditSubtask(ctx, task, subtask, scope)) {
    fail("You do not have permission to change this step.", 403, "FORBIDDEN");
  }

  if (wantsStatus && !canTickSubtask(ctx, task, subtask, scope)) {
    fail("Only the person this step is for can change its status.", 403, "FORBIDDEN");
  }

  const now = Date.now();
  const next = { ...subtask, updatedAt: now };
  const fromStatus = subtaskStatusOf(subtask);
  let joins = false;

  if (payload.estimateMinutes !== undefined) {
    const estimate = cleanEstimate(payload.estimateMinutes);
    if (estimate) next.estimateMinutes = estimate;
    else delete next.estimateMinutes;
  }

  if (payload.title !== undefined) next.title = cleanTitle(payload.title);

  if (payload.assignedTo !== undefined) {
    const assignedTo = String(payload.assignedTo ?? "").trim();

    if (assignedTo && assignedTo !== subtask.assignedTo) {
      joins = (await checkAssignee(companyCode, ctx, task, assignedTo, scope)).joins;
    }

    if (assignedTo) next.assignedTo = assignedTo;
    else delete next.assignedTo;
  }

  if (payload.dueDate !== undefined) {
    const dueDate = String(payload.dueDate ?? "").trim();

    if (dueDate) {
      const result = validateDueDate(dueDate, todayKey(), {
        allowPast: dueDate === subtask.dueDate,
      });
      if (result.error) fail(result.error, 400);
      next.dueDate = result.value;
    } else {
      delete next.dueDate;
    }
  }

  const actionBy = await actorName(companyCode, ctx);

  if (wantsStatus) {
    next.status = nextStatus;
    next.done = nextStatus === SUBTASK_DONE;
    // Pehli baar In Progress — shuru ki tareekh, reopen par bhi wahi rehti hai
    if (nextStatus === SUBTASK_IN_PROGRESS && !next.startedAt) next.startedAt = now;
    if (next.done && fromStatus !== SUBTASK_DONE) {
      next.doneAt = now;
      next.doneById = ctx.actorId;
      next.doneBy = actionBy;
    }
    if (!next.done) {
      delete next.doneAt;
      delete next.doneById;
      delete next.doneBy;
    }
  }

  const rel = relPath(bucket, task.id);
  const statusChanged = wantsStatus && nextStatus !== fromStatus;
  const type = !statusChanged
    ? ACTIVITY_TYPE.SUBTASK_UPDATED
    : nextStatus === SUBTASK_DONE
      ? ACTIVITY_TYPE.SUBTASK_COMPLETED
      : fromStatus === SUBTASK_DONE
        ? ACTIVITY_TYPE.SUBTASK_REOPENED
        : ACTIVITY_TYPE.SUBTASK_STATUS;

  const stepPath = `records/${task.id}/subtasks/${subtaskId}`;
  const updates = {};

  STEP_FIELDS.forEach((field) => {
    if (next[field] !== subtask[field]) {
      updates[`${stepPath}/${field}`] = next[field] === undefined ? null : next[field];
    }
  });

  Object.assign(updates, summaryUpdates(rel, { ...existing, [subtaskId]: next }), {
    [`${rel}/updatedAt`]: now,
    [`records/${task.id}/activity/${activityKey(ctx.actorId)}/${now}`]: {
      type,
      actionBy,
      subtaskTitle: next.title,
      // stepStatus — toStatus nahi: wo naam task ke status ka hai, aur page
      // usi se task ka waqt ginta hai
      ...(type === ACTIVITY_TYPE.SUBTASK_STATUS ? { stepStatus: nextStatus } : {}),
      ...(next.assignedTo ? { targetId: next.assignedTo } : {}),
      ...(joins ? { membersAdded: [next.assignedTo] } : {}),
    },
  });

  if (joins) updates[`${rel}/members/${next.assignedTo}`] = true;

  // Step Paused / Done / To Do — us par chal raha timer yahin rukta hai
  if (statusChanged && nextStatus !== SUBTASK_IN_PROGRESS) {
    const current = await taskTime.readCurrent(companyCode);
    if (stopWorkOnStep(updates, current, found, subtaskId, { now })) {
      await pauseRunningSteps(companyCode, [task.id], updates, now);
    }
  }

  await commit(companyCode, updates, now);

  if (next.assignedTo && next.assignedTo !== subtask.assignedTo) {
    await notifySubtaskAssigned(companyCode, task, next, { id: ctx.actorId, name: actionBy });
  }

  return { status: 200, subtask: { ...next, id: subtaskId }, joined: joins };
}

async function deleteSubtask({ companyCode, user, taskId, subtaskId }) {
  const ctx = await loadActor(companyCode, user);
  const found = await findVisibleTask(companyCode, ctx, taskId);
  const { task, bucket } = found;

  assertNotArchived(task);

  const existing = await readSubtasks(companyCode, task.id);
  const subtask = existing[subtaskId];

  if (!subtask) fail("Step not found.", 404, "NOT_FOUND");

  const scope = await managerScopeIds(companyCode, user, ctx);

  if (!canEditSubtask(ctx, task, subtask, scope)) {
    fail("You do not have permission to remove this step.", 403, "FORBIDDEN");
  }

  const now = Date.now();
  const rest = { ...existing };
  delete rest[subtaskId];
  const rel = relPath(bucket, task.id);

  const updates = {
    [`records/${task.id}/subtasks/${subtaskId}`]: null,
    ...summaryUpdates(rel, rest),
    [`${rel}/updatedAt`]: now,
    [`records/${task.id}/activity/${activityKey(ctx.actorId)}/${now}`]: {
      type: ACTIVITY_TYPE.SUBTASK_REMOVED,
      actionBy: await actorName(companyCode, ctx),
      subtaskTitle: subtask.title || "",
    },
  };

  // Step mit raha hai — us par ka waqt task mein juda rehta hai (step ke
  // khaate mein nahi, wo khaata hi ja raha hai), aur timer rukta hai
  const current = await taskTime.readCurrent(companyCode);
  if (stopWorkOnStep(updates, current, found, subtaskId, { now, skipSubtask: true })) {
    await pauseRunningSteps(companyCode, [found.task.id], updates, now);
  }

  await commit(companyCode, updates, now);

  return { status: 200, deleted: true };
}

/*
| Step ke person picker ki list — server hi batata hai kaun chuna ja sakta
| hai, taaki dropdown mein wahi log hon jinhe save karne par server maanega.
|
|   onTask : jo pehle se task par hain (sabke liye)
|   others : Owner → sab, HR → jo rok mein nahi, Manager → apna department,
|            Employee → koi nahi ("manager se kaho")
*/
async function subtaskAssignees({ companyCode, user, taskId }) {
  const ctx = await loadActor(companyCode, user);
  const { task } = await findVisibleTask(companyCode, ctx, taskId);
  const team = teamOf(task);

  const onTaskPeople = await Promise.all(team.map((id) => loadPerson(companyCode, id)));
  const onTask = onTaskPeople.filter(Boolean).map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    isOwner: person.id === task.assignedTo,
  }));

  if (![ROLE.OWNER, ROLE.HR, ROLE.MANAGER].includes(ctx.role)) {
    return { status: 200, onTask, others: [] };
  }

  const root = taskStore.companyRoot(companyCode);
  const [employeesSnap, departmentsSnap, scope] = await Promise.all([
    db.ref(`${root}/employees`).once("value"),
    db.ref(`${root}/departments`).once("value"),
    managerScopeIds(companyCode, user, ctx),
  ]);

  const employees = employeesSnap.val() || {};
  const departments = departmentsSnap.val() || {};

  const others = Object.entries(employees)
    .filter(([id]) => !team.includes(id))
    .filter(([, employee]) => {
      const status = employee?.account?.status;
      return !status || status === "Active";
    })
    .filter(([id, employee]) => {
      const role = String(employee?.account?.role || "").toLowerCase();
      const isSelf = id === ctx.actorId;
      if (ctx.role === ROLE.OWNER) return true;
      if (ctx.role === ROLE.HR) return isAssignableRole(ROLE.HR, role, isSelf);
      return (isSelf || scope.includes(id)) && isAssignableRole(ROLE.MANAGER, role, isSelf);
    })
    .map(([id, employee]) => ({
      id,
      name: employee?.personalInfo?.name || id,
      department: departments[employee?.employmentInfo?.departmentId]?.name || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { status: 200, onTask, others };
}

module.exports = {
  listSubtasks,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  subtaskAssignees,
};
