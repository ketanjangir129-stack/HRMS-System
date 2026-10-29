const db = require("../config/firebase");
const taskStore = require("./taskStore");
const taskTime = require("./taskTime");
const taskDueJob = require("../jobs/taskDueJob");
const taskWorkJob = require("../jobs/taskWorkJob");
const {
  notifyTaskCreated,
  notifyTaskUpdated,
  notifyTaskCompleted,
} = require("./taskNotificationService");
const {
  TASK_STATUSES,
  DEFAULT_TASK_STATUS,
  IN_PROGRESS_STATUS,
  PAUSED_STATUS,
  COMPLETED_STATUS,
  MEMBER_LIMIT,
  ROLE,
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
  canSeeTask,
  canEditAll,
  canEditDetails,
  canChangeStatus,
  canManageMembers,
  isArchived,
  subtaskSummary,
  subtaskStatusOf,
  SUBTASK_IN_PROGRESS,
  SUBTASK_DONE,
} = require("../utils/taskRules");

const {
  fail,
  todayKey,
  taskBucket,
  relPath,
  readRun,
  findTask,
  indexValue,
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
| Task Service
|--------------------------------------------------------------------------
| Har niyam server par — browser jo bhi bheje, yahan dobara jaancha jaata
| hai. Niyam khud utils/taskRules.js mein hain, Firebase ka kaam
| taskStore.js mein; ye file dono ko jodti hai.
|
| Ek task par ab ek owner (assignedTo, pehle jaisa) aur kai members ho sakte
| hain. Kaun abhi kaam kar raha hai, wo working/{employeeId} mein — status
| poore task ka hai, kaam har insaan ka apna.
|--------------------------------------------------------------------------
*/

// Validation ka nateeja — galti ho to wahi 400, warna saaf value
const take = (result) => (result.error ? fail(result.error, 400) : result.value);

const membersObject = (ids) =>
  ids.length ? Object.fromEntries(ids.map((id) => [id, true])) : null;

/*
| Kisi ko task (owner ya member) dena. Chaar sawaal:
|   1. wo insaan hai bhi?
|   2. doosre ko dene ka haq hai? (tasks.create — warna sirf khud ko)
|   3. uske role ko de sakte ho? (HR doosre HR/Manager ko nahi, waghera)
|   4. Manager ho to wo insaan uske department ka hai? (scope —
|      managerScopeIds, wahi jo steps aur attendance mein lagta hai)
*/
const assertAssignable = async (companyCode, ctx, targetId, scope = null) => {
  const person = await loadPerson(companyCode, targetId);

  if (!person) fail("Selected employee does not exist.", 400);

  const isSelf = targetId === ctx.actorId;

  if (!isSelf && !ctx.can("tasks.create")) {
    fail("You can only assign tasks to yourself.", 403, "FORBIDDEN");
  }

  if (!isAssignableRole(ctx.role, person.role, isSelf)) {
    fail(`You can't assign tasks to ${person.name}.`, 403, "FORBIDDEN");
  }

  if (ctx.role === ROLE.MANAGER && !isSelf && !(scope || []).includes(targetId)) {
    fail(`${person.name} is not in your department.`, 403, "FORBIDDEN");
  }

  return person;
};

// Manager ke department ke log — baaki roles ke liye null (koi had nahi)
const assignScope = async (companyCode, user, ctx) =>
  ctx.role === ROLE.MANAGER ? managerScopeIds(companyCode, user, ctx) : null;

// Task dikhni hi nahi chahiye to 404 — "hai par tumhari nahi" bhi na bataye
const findVisibleTask = async (companyCode, ctx, taskId) => {
  const found = await findTask(companyCode, taskId);

  if (!found || !(canSeeTask(ctx, found.task) || canEditAll(ctx))) {
    fail("Task not found.", 404, "NOT_FOUND");
  }

  return found;
};

/*
| Actor aur task ek saath padho. Dono alag Firebase reads hain (~300ms
| har ek) aur ek doosre par tike nahi — line mein lagane se drawer har
| baar bina wajah ruka rehta tha.
*/
const loadVisibleTask = async (companyCode, user, taskId) => {
  const [ctx, found] = await Promise.all([
    loadActor(companyCode, user),
    findTask(companyCode, taskId),
  ]);

  if (!found || !(canSeeTask(ctx, found.task) || canEditAll(ctx))) {
    fail("Task not found.", 404, "NOT_FOUND");
  }

  return { ctx, ...found };
};

const assertNotArchived = (task) => {
  if (isArchived(task)) {
    fail("This task is archived. Restore it before making changes.", 400, "ARCHIVED");
  }
};

/* ── List ── */

/*
| Sirf wo tasks jo is user ko dikhne chahiye — filter server par. Pehle
| browser poora run node utaarta tha aur doosron ke tasks khud chhupata tha.
|
| people: list mein aane wale har insaan ka naam, taaki Employee (jiske paas
| poori employees list nahi aati) bhi apne teammates ke naam dekh sake.
*/
async function getTasks(companyCode, user, { archived = false } = {}) {
  const ctx = await loadActor(companyCode, user);

  if (archived && !ctx.can("tasks.delete")) {
    fail("You do not have permission to view archived tasks.", 403, "FORBIDDEN");
  }

  const items = await readRun(companyCode);

  // Due/overdue khabar — ghante mein ek baar, company ke pehle request par.
  // Bhoole hue timer (10 ghante) bhi isi tarah pakde jaate hain
  taskDueJob.track(companyCode);
  taskWorkJob.track(companyCode);

  const tasks = items
    .map((item) => item.task)
    .filter((task) => (archived ? isArchived(task) : !isArchived(task)))
    .filter((task) => canSeeTask(ctx, task));

  const people = await peopleNames(
    companyCode,
    tasks.flatMap((task) => [...teamOf(task), task.createdById])
  );

  return { tasks, people };
}

/* ── Create ── */

async function createTask({ companyCode, user, payload }) {
  const ctx = await loadActor(companyCode, user);
  const today = todayKey();

  const title = take(validateTitle(payload?.title));
  const description = take(validateDescription(payload?.description));
  const dueDate = take(validateDueDate(payload?.dueDate, today));
  const priority = take(validatePriority(payload?.priority));

  // Sirf createOwn wala apne liye hi bana sakta hai — token se force,
  // browser ke bheje assignee par bharosa nahi
  const assignedTo = ctx.can("tasks.create")
    ? String(payload?.assignedTo ?? "").trim()
    : ctx.actorId;

  if (!assignedTo) fail("Please select an employee.", 400);

  const scope = await assignScope(companyCode, user, ctx);

  await assertAssignable(companyCode, ctx, assignedTo, scope);

  const members = cleanMemberList(payload?.members, assignedTo);

  if (members.length && !ctx.can("tasks.create")) {
    fail("You do not have permission to add people to a task.", 403, "FORBIDDEN");
  }

  if (members.length > MEMBER_LIMIT) {
    fail(`A task can have at most ${MEMBER_LIMIT} team members.`, 400);
  }

  for (const memberId of members) {
    await assertAssignable(companyCode, ctx, memberId, scope);
  }

  const now = Date.now();
  const taskId = db.ref(`${taskStore.tasksRoot(companyCode)}/run`).push().key;
  const bucket = taskBucket(todayKey(now));
  const createdBy = await actorName(companyCode, ctx);

  const newTask = {
    title,
    description,
    assignedTo,
    dueDate,
    priority,
    status: DEFAULT_TASK_STATUS,
    createdAt: now,
    updatedAt: now,
    createdBy,
    createdById: ctx.actorId,
    ...(members.length ? { members: membersObject(members) } : {}),
  };

  await commit(
    companyCode,
    {
      [relPath(bucket, taskId)]: newTask,
      [`index/${taskId}`]: indexValue(bucket),
    },
    now
  );

  const task = { id: taskId, ...newTask };

  await notifyTaskCreated(companyCode, task, { id: ctx.actorId, name: createdBy }, members);

  return { status: 201, task };
}

/* ── Edit ── */

const DETAIL_FIELDS = ["title", "description", "assignedTo", "dueDate", "priority"];
const TRACKED_FIELDS = ["title", "dueDate", "priority", "assignedTo"];

/*
| Details (title, description, owner, date, priority) aur team (members)
| dono yahin se. Dono ke haq alag hain: details ke liye edit ka haq, team
| ke liye doosron ko task dene ka haq.
|
| expectedUpdatedAt: page jo updatedAt dekh raha tha. Beech mein kisi aur ne
| badal diya ho to 409 — chup-chaap doosre ka kaam overwrite nahi hota.
*/
async function updateTask({ companyCode, user, taskId, payload = {} }) {
  const ctx = await loadActor(companyCode, user);
  const { task, bucket } = await findVisibleTask(companyCode, ctx, taskId);

  assertNotArchived(task);

  const expected = payload.expectedUpdatedAt;
  if (
    expected !== undefined &&
    expected !== null &&
    Number(expected) !== Number(task.updatedAt || 0)
  ) {
    fail("This task was changed by someone else. Reload it and try again.", 409, "CONFLICT");
  }

  const detailKeys = DETAIL_FIELDS.filter((field) => payload[field] !== undefined);
  const wantsMembers = payload.members !== undefined;

  if (!detailKeys.length && !wantsMembers) fail("Nothing to update.", 400);

  if (detailKeys.length && !canEditDetails(ctx, task)) {
    fail("You do not have permission to update this task.", 403, "FORBIDDEN");
  }

  if (wantsMembers && !canManageMembers(ctx, task)) {
    fail("You do not have permission to change who is on this task.", 403, "FORBIDDEN");
  }

  const today = todayKey();
  const next = {};

  if (payload.title !== undefined) next.title = take(validateTitle(payload.title));

  if (payload.description !== undefined) {
    next.description = take(validateDescription(payload.description));
  }

  if (payload.dueDate !== undefined) {
    // Purani date waisi hi rahe to "past" ka check nahi — warna kal ki due
    // date wala task edit hi nahi hota
    const unchanged = String(payload.dueDate).trim() === task.dueDate;
    next.dueDate = take(validateDueDate(payload.dueDate, today, { allowPast: unchanged }));
  }

  if (payload.priority !== undefined) {
    next.priority = take(validatePriority(payload.priority, { strict: true }));
  }

  if (payload.assignedTo !== undefined) {
    const assignedTo = String(payload.assignedTo).trim();
    if (!assignedTo) fail("Please select an employee.", 400);
    if (assignedTo !== task.assignedTo) {
      await assertAssignable(companyCode, ctx, assignedTo, await assignScope(companyCode, user, ctx));
    }
    next.assignedTo = assignedTo;
  }

  const owner = next.assignedTo ?? task.assignedTo;
  const beforeMembers = memberIdsOf(task);
  const members = wantsMembers
    ? cleanMemberList(payload.members, owner)
    : beforeMembers.filter((id) => id !== owner);

  if (members.length > MEMBER_LIMIT) {
    fail(`A task can have at most ${MEMBER_LIMIT} team members.`, 400);
  }

  const beforeTeam = teamOf(task);
  const afterTeam = [owner, ...members];
  const added = members.filter((id) => !beforeTeam.includes(id));
  const removed = beforeTeam.filter((id) => !afterTeam.includes(id));

  // Sirf naye log jaanche jaate hain — HR ne pehle jinhe joda wo bane rehte hain
  const addScope = added.length ? await assignScope(companyCode, user, ctx) : null;
  for (const memberId of added) {
    await assertAssignable(companyCode, ctx, memberId, addScope);
  }

  const changes = {};
  TRACKED_FIELDS.forEach((field) => {
    if (next[field] !== undefined && next[field] !== task[field]) {
      changes[field] = { from: task[field] ?? null, to: next[field] };
    }
  });
  if (next.description !== undefined && next.description !== task.description) {
    changes.description = { changed: true };
  }

  const membersDiffer =
    members.length !== beforeMembers.length ||
    members.some((id) => !beforeMembers.includes(id));

  if (!Object.keys(changes).length && !membersDiffer) {
    return { status: 200, changed: false, task };
  }

  const now = Date.now();
  const rel = relPath(bucket, task.id);
  const actionBy = await actorName(companyCode, ctx);
  const updates = {};

  Object.keys(next).forEach((field) => {
    if (changes[field]) updates[`${rel}/${field}`] = next[field];
  });

  if (membersDiffer || changes.assignedTo) {
    updates[`${rel}/members`] = membersObject(members);
  }

  // Jo task se hat gaya uska "kaam chal raha hai" bhi hat jaata hai
  let working = task.working;
  if (removed.length && task.working) {
    working = { ...task.working };
    removed.forEach((id) => delete working[id]);
    working = Object.keys(working).length ? working : null;
    updates[`${rel}/working`] = working;
  }

  // Hataye gaye log is task par kaam kar rahe the to unka waqt yahin band
  if (removed.length) {
    const current = await taskTime.readCurrent(companyCode);
    taskTime
      .sessionsOnTask(current, task.id)
      .filter((entry) => removed.includes(entry.employeeId))
      .forEach((entry) =>
        taskTime.closeSession(updates, entry, {
          endAt: now,
          reason: "removed",
          items: [{ task, bucket }],
        })
      );
  }

  updates[`${rel}/updatedAt`] = now;
  updates[`records/${task.id}/activity/${activityKey(ctx.actorId)}/${now}`] = {
    type: ACTIVITY_TYPE.TASK_UPDATED,
    actionBy,
    ...(Object.keys(changes).length ? { changes } : {}),
    ...(added.length ? { membersAdded: added } : {}),
    ...(removed.length ? { membersRemoved: removed } : {}),
  };

  await commit(companyCode, updates, now);

  const after = { ...task, ...next, updatedAt: now, id: task.id };
  if (membersObject(members)) after.members = membersObject(members);
  else delete after.members;
  if (working) after.working = working;
  else delete after.working;

  const names = changes.assignedTo
    ? await peopleNames(companyCode, [after.assignedTo])
    : {};

  await notifyTaskUpdated(
    companyCode,
    {
      before: task,
      after,
      added,
      // Purane owner ko "reassigned" wali khabar alag se jaati hai
      removed: removed.filter((id) => !(changes.assignedTo && id === task.assignedTo)),
      team: teamOf(after),
    },
    { id: ctx.actorId, name: actionBy },
    names
  );

  return { status: 200, changed: true, task: after };
}

/* ── Status & work ── */

/*
| "Ek insaan, ek waqt, ek kaam" — par ab insaan ke hisaab se, task ke nahi.
|
| worker kaam shuru karta hai to uska baaki jagah ka kaam rukta hai. Us
| doosre task par koi aur bhi lagā ho to wo task In Progress hi rehta hai;
| sirf tab Paused hota hai jab us par koi bacha hi na ho.
|
| Ye sab ek hi updates object mein jaata hai — caller ek commit karta hai,
| isliye beech mein do jagah "kaam chal raha hai" kabhi nahi dikhta.
*/
/*
| Waqt ka hisaab bhi yahin: worker ka pichhla session (kahin bhi ho) band,
| aur is task — ya iske kisi step — par naya session shuru.
|
| options.current: tasks/current (sabke chalte sessions)
| options.subtask: { id, title } — step par kaam shuru ho raha hai
*/
const buildStartWork = (items, found, worker, meta, { current = {}, subtask = null, companyCode } = {}) => {
  const { task, bucket } = found;
  const { now, actionBy, actionKey } = meta;
  const rel = relPath(bucket, task.id);
  const fromStatus = task.status || DEFAULT_TASK_STATUS;
  const entry = current[worker];

  /*
  | Wahi kaam pehle se chal raha hai — task bhi, step bhi. Chalta session
  | (current) hona zaroori hai: purane task par "In Progress, working node
  | nahi" ka matlab "owner kaam kar raha" maana jaata hai, par us par waqt
  | gina hi nahi ja raha — Start dabane par session khulna chahiye.
  */
  const sameWork = Boolean(entry) &&
    entry.taskId === task.id &&
    (entry.subtaskId || null) === (subtask?.id || null);

  if (fromStatus === IN_PROGRESS_STATUS && isWorkingOn(task, worker) && sameWork) {
    return { changed: false, updates: {}, paused: [], pausedIds: [] };
  }

  const working = {};
  if (fromStatus === IN_PROGRESS_STATUS) {
    workingIdsOf(task).forEach((id) => {
      working[id] = task.working?.[id] || task.updatedAt || now;
    });
  }
  working[worker] = now;

  const updates = {
    [`${rel}/status`]: IN_PROGRESS_STATUS,
    [`${rel}/working`]: working,
    [`${rel}/updatedAt`]: now,
    [`${rel}/completedAt`]: null,
    // Pehli baar kaam shuru hua — ye tareekh phir kabhi nahi badalti
    ...(task.startedAt ? {} : { [`${rel}/startedAt`]: now }),
    [`records/${task.id}/activity/${actionKey}/${now}`]:
      fromStatus === IN_PROGRESS_STATUS
        ? {
            type: ACTIVITY_TYPE.WORK_STARTED,
            actionBy,
            targetId: worker,
            ...(subtask ? { subtaskTitle: subtask.title || "" } : {}),
          }
        : {
            type: ACTIVITY_TYPE.STATUS_CHANGED,
            fromStatus,
            toStatus: IN_PROGRESS_STATUS,
            actionBy,
            ...(subtask ? { subtaskTitle: subtask.title || "" } : {}),
          },
  };

  // Pichhla session band — chahe isi task ka doosra step ho ya koi aur task
  if (entry) {
    taskTime.closeSession(updates, { ...entry, employeeId: worker }, {
      endAt: now,
      reason: "switch",
      items,
    });
  }

  taskTime.openSession(updates, { companyCode, employeeId: worker, task, bucket, subtask, now });

  const paused = [];
  // Jo doosre tasks poori tarah ruk gaye — caller unke chalte steps bhi rokta hai
  const pausedIds = [];

  items.forEach(({ task: sibling, bucket: siblingBucket }) => {
    if (sibling.id === task.id || isArchived(sibling)) return;
    if (!isWorkingOn(sibling, worker)) return;

    const siblingRel = relPath(siblingBucket, sibling.id);
    const remaining = workingIdsOf(sibling).filter((id) => id !== worker);
    const entryPath = `records/${sibling.id}/activity/${actionKey}/${now}`;

    if (!remaining.length) {
      updates[`${siblingRel}/status`] = PAUSED_STATUS;
      updates[`${siblingRel}/working`] = null;
      updates[`${siblingRel}/updatedAt`] = now;
      pausedIds.push(sibling.id);
      updates[entryPath] = {
        type: ACTIVITY_TYPE.AUTO_PAUSED,
        fromStatus: sibling.status,
        toStatus: PAUSED_STATUS,
        actionBy,
        auto: true,
        message: `Paused automatically when "${task.title || "another task"}" was started`,
      };
    } else {
      const left = { ...(sibling.working || {}) };
      delete left[worker];
      updates[`${siblingRel}/working`] = Object.keys(left).length ? left : null;
      updates[`${siblingRel}/updatedAt`] = now;
      updates[entryPath] = {
        type: ACTIVITY_TYPE.WORK_STOPPED,
        actionBy,
        targetId: worker,
        auto: true,
        message: `Stopped working here when "${task.title || "another task"}" was started`,
      };
    }

    paused.push(sibling.title || sibling.id);
  });

  return { changed: true, updates, paused, pausedIds };
};

const workMeta = async (companyCode, ctx) => ({
  now: Date.now(),
  actionBy: await actorName(companyCode, ctx),
  actionKey: activityKey(ctx.actorId),
});

async function updateTaskStatus({ companyCode, user, taskId, status }) {
  if (!TASK_STATUSES.includes(status)) fail("Invalid task status.", 400);

  const ctx = await loadActor(companyCode, user);
  const items = await readRun(companyCode);
  const found = items.find((item) => item.task.id === String(taskId || ""));

  if (!found || !(canSeeTask(ctx, found.task) || canEditAll(ctx))) {
    fail("Task not found.", 404, "NOT_FOUND");
  }

  const { task, bucket } = found;

  assertNotArchived(task);

  if (!canChangeStatus(ctx, task)) {
    fail("You do not have permission to update this task.", 403, "FORBIDDEN");
  }

  const meta = await workMeta(companyCode, ctx);
  const fromStatus = task.status || DEFAULT_TASK_STATUS;
  const current = await taskTime.readCurrent(companyCode);

  /*
  | In Progress: kaam kaun shuru kar raha hai? Jo task par hai wo khud. HR
  | ya Owner jaisa koi bahar wala badle to owner ka kaam shuru maana jaata
  | hai — pehle bhi yahi hota tha.
  */
  if (status === IN_PROGRESS_STATUS) {
    const worker = isOnTask(task, ctx.actorId) ? ctx.actorId : task.assignedTo;
    const result = buildStartWork(items, found, worker, meta, { current, companyCode });

    if (!result.changed) return { status: 200, changed: false, paused: [] };

    await pauseRunningSteps(companyCode, result.pausedIds, result.updates, meta.now);
    await commit(companyCode, result.updates, meta.now);
    return { status: 200, changed: true, paused: result.paused };
  }

  /*
  | Team ka banda Paused chune jab baaki abhi kaam kar rahe hain — wo sirf
  | apna kaam rokta hai ("Stop my work" jaisa), doosron ka timer nahi.
  | Owner/HR (canEditAll) poora task rok sakte hain, jaise pehle — kisi
  | task ko poori tarah hold par daalna unka faisla hai.
  |
  | onlyMine: page ko pata chale ki task In Progress hi raha.
  */
  if (status === PAUSED_STATUS && !canEditAll(ctx)) {
    const othersWorking = workingIdsOf(task).some((id) => id !== ctx.actorId);

    if (othersWorking) {
      const changed = await stopMyWork(companyCode, found, ctx.actorId, meta, current, items);
      return { status: 200, changed, paused: [], onlyMine: true };
    }
  }

  if (fromStatus === status) return { status: 200, changed: false, paused: [] };

  const rel = relPath(bucket, task.id);
  const updates = {
    [`${rel}/status`]: status,
    [`${rel}/working`]: null,
    [`${rel}/updatedAt`]: meta.now,
    [`${rel}/completedAt`]: status === COMPLETED_STATUS ? meta.now : null,
    [`records/${task.id}/activity/${meta.actionKey}/${meta.now}`]: {
      type: ACTIVITY_TYPE.STATUS_CHANGED,
      fromStatus,
      toStatus: status,
      actionBy: meta.actionBy,
    },
  };

  // Task ruka / poora hua — is par chal rahe sabke sessions yahin band
  taskTime.sessionsOnTask(current, task.id).forEach((entry) =>
    taskTime.closeSession(updates, entry, { endAt: meta.now, reason: "status", items })
  );

  // Task seedha Paused kiya — uske chalte steps bhi ruke
  if (status === PAUSED_STATUS) {
    await pauseRunningSteps(companyCode, [task.id], updates, meta.now);
  }

  await commit(companyCode, updates, meta.now);

  if (status === COMPLETED_STATUS) {
    await notifyTaskCompleted(
      companyCode,
      task,
      { id: ctx.actorId, name: meta.actionBy },
      teamOf(task)
    );
  }

  return { status: 200, changed: true, paused: [] };
}

/*
| Team ka ek insaan apna kaam shuru ya band kare — task ka status poore
| task ka hai, ye sirf "main is par hoon / nahi hoon".
|
| subtaskId diya ho to kaam us step par shuru hota hai: step "In Progress"
| ho jaata hai, aur waqt us step ke khaate mein bhi judta hai. Bina person
| wala step jo shuru kare, step usi ka ho jaata hai.
|
| Band karne par: koi aur abhi bhi laga hai to task In Progress hi rehta
| hai; aakhri insaan ruka to task Paused. Session (waqt) dono soorat band.
*/
async function setWork({ companyCode, user, taskId, action, subtaskId }) {
  if (!["start", "stop"].includes(action)) fail("Invalid work action.", 400);

  const ctx = await loadActor(companyCode, user);
  const items = await readRun(companyCode);
  const found = items.find((item) => item.task.id === String(taskId || ""));

  if (!found || !canSeeTask(ctx, found.task)) fail("Task not found.", 404, "NOT_FOUND");

  const { task, bucket } = found;

  assertNotArchived(task);

  if (!isOnTask(task, ctx.actorId)) {
    fail("Only people on this task can start or stop work on it.", 403, "FORBIDDEN");
  }

  if (task.status === COMPLETED_STATUS) {
    fail("This task is completed. Reopen it to start work again.", 400);
  }

  const meta = await workMeta(companyCode, ctx);
  const current = await taskTime.readCurrent(companyCode);
  const rel = relPath(bucket, task.id);

  if (action === "start") {
    let subtask = null;
    const stepUpdates = {};

    if (subtaskId) {
      const stepsSnap = await db
        .ref(`${taskStore.tasksRoot(companyCode)}/records/${task.id}/subtasks`)
        .once("value");
      const steps = stepsSnap.val() || {};
      const step = steps[subtaskId];

      if (!step) fail("Step not found.", 404, "NOT_FOUND");
      if (step.done || step.status === SUBTASK_DONE) {
        fail("This step is done. Reopen it to work on it again.", 400);
      }
      if (step.assignedTo && step.assignedTo !== ctx.actorId) {
        const names = await peopleNames(companyCode, [step.assignedTo]);
        fail(`This step is for ${names[step.assignedTo]}.`, 403, "FORBIDDEN");
      }

      subtask = { id: subtaskId, title: step.title || "" };
      const stepPath = `records/${task.id}/subtasks/${subtaskId}`;
      stepUpdates[`${stepPath}/status`] = SUBTASK_IN_PROGRESS;
      stepUpdates[`${stepPath}/updatedAt`] = meta.now;
      if (!step.startedAt) stepUpdates[`${stepPath}/startedAt`] = meta.now;

      // Bina person wala step — jisne shuru kiya uska
      if (!step.assignedTo) {
        stepUpdates[`${stepPath}/assignedTo`] = ctx.actorId;
        const summary = subtaskSummary({ ...steps, [subtaskId]: { ...step, assignedTo: ctx.actorId } });
        stepUpdates[`${rel}/subtaskOpenBy`] = summary.subtaskOpenBy;
      }
    }

    const result = buildStartWork(items, found, ctx.actorId, meta, { current, subtask, companyCode });
    if (!result.changed) return { status: 200, changed: false, paused: [] };
    const updates = { ...result.updates, ...stepUpdates };
    await pauseRunningSteps(companyCode, result.pausedIds, updates, meta.now);
    await commit(companyCode, updates, meta.now);
    return { status: 200, changed: true, paused: result.paused };
  }

  const changed = await stopMyWork(companyCode, found, ctx.actorId, meta, current, items);
  return { status: 200, changed, paused: [] };
}

/*
| Ek insaan ka kaam band — "Stop my work" / "Pause" button, aur team ke
| bande ka status bar mein Paused (updateTaskStatus) dono yahin se.
|
|   koi aur abhi laga hai → task In Progress, sirf mera timer aur mere
|                           steps Paused (doosre ka step chalta rehta hai)
|   main aakhri tha       → task Paused, uske saare chalte steps bhi
|
| Lautata hai false jab main is task par kaam kar hi nahi raha tha.
*/
const stopMyWork = async (companyCode, found, actorId, meta, current, items) => {
  const { task, bucket } = found;
  const rel = relPath(bucket, task.id);
  const entry = current[actorId];
  const entryOnTask = entry?.taskId === task.id;

  if (!isWorkingOn(task, actorId) && !entryOnTask) return false;

  const remaining = workingIdsOf(task).filter((id) => id !== actorId);
  const entryPath = `records/${task.id}/activity/${meta.actionKey}/${meta.now}`;
  const updates = { [`${rel}/updatedAt`]: meta.now };

  if (entryOnTask) {
    taskTime.closeSession(updates, { ...entry, employeeId: actorId }, {
      endAt: meta.now,
      reason: "stop",
      items,
    });
  }

  if (remaining.length) {
    const left = { ...(task.working || {}) };
    delete left[actorId];
    updates[`${rel}/working`] = left;
    updates[entryPath] = {
      type: ACTIVITY_TYPE.WORK_STOPPED,
      actionBy: meta.actionBy,
      targetId: actorId,
    };
    // Main ruka, team nahi — sirf mere steps Paused
    await pauseRunningSteps(companyCode, [task.id], updates, meta.now, {
      employeeId: actorId,
      subtaskId: entryOnTask ? entry.subtaskId : undefined,
    });
  } else {
    updates[`${rel}/working`] = null;
    updates[`${rel}/status`] = PAUSED_STATUS;
    updates[entryPath] = {
      type: ACTIVITY_TYPE.STATUS_CHANGED,
      fromStatus: task.status || DEFAULT_TASK_STATUS,
      toStatus: PAUSED_STATUS,
      actionBy: meta.actionBy,
    };
    // Aakhri insaan ne "Pause" dabaya — task ruka, uske chalte steps bhi
    await pauseRunningSteps(companyCode, [task.id], updates, meta.now);
  }

  await commit(companyCode, updates, meta.now);
  return true;
};

/* ── Archive / restore / delete ── */

/*
| Delete ab "archive" hai — task aur uski history bachi rehti hai, list se
| hat jaata hai, aur wapas laaya ja sakta hai. Hamesha ke liye mitana sirf
| Owner kar sakta hai (permanent).
*/
async function deleteTask({ companyCode, user, taskId, permanent = false }) {
  const ctx = await loadActor(companyCode, user);
  const found = await findTask(companyCode, taskId);

  if (!found) fail("Task not found.", 404, "NOT_FOUND");

  const { task, bucket } = found;
  const rel = relPath(bucket, task.id);

  const current = await taskTime.readCurrent(companyCode);
  const running = taskTime.sessionsOnTask(current, task.id);

  if (permanent) {
    if (ctx.role !== ROLE.OWNER) {
      fail("Only the company owner can permanently delete a task.", 403, "FORBIDDEN");
    }

    // Task, uski history aur index — ek saath, taaki kuch anaath na bache
    const updates = {
      [rel]: null,
      [`records/${task.id}`]: null,
      [`index/${task.id}`]: null,
    };

    // Chalta waqt din ke hisaab mein jud jaata hai; task ke records to mit hi rahe hain
    const now = Date.now();
    running.forEach((entry) =>
      taskTime.closeSession(updates, entry, { endAt: now, reason: "deleted", skipTask: true })
    );

    await commit(companyCode, updates);

    return { status: 200, deleted: true, permanent: true };
  }

  if (isArchived(task)) return { status: 200, archived: true, changed: false };

  const meta = await workMeta(companyCode, ctx);
  const updates = {
    [`${rel}/archivedAt`]: meta.now,
    [`${rel}/archivedById`]: ctx.actorId,
    [`${rel}/archivedBy`]: meta.actionBy,
    [`${rel}/working`]: null,
    [`${rel}/updatedAt`]: meta.now,
    [`records/${task.id}/activity/${meta.actionKey}/${meta.now}`]: {
      type: ACTIVITY_TYPE.ARCHIVED,
      actionBy: meta.actionBy,
    },
  };

  running.forEach((entry) =>
    taskTime.closeSession(updates, entry, {
      endAt: meta.now,
      reason: "archived",
      items: [found],
    })
  );

  await commit(companyCode, updates, meta.now);

  return { status: 200, archived: true, changed: true };
}

async function restoreTask({ companyCode, user, taskId }) {
  const ctx = await loadActor(companyCode, user);
  const found = await findTask(companyCode, taskId);

  if (!found) fail("Task not found.", 404, "NOT_FOUND");

  const { task, bucket } = found;

  if (!isArchived(task)) return { status: 200, restored: true, changed: false };

  const meta = await workMeta(companyCode, ctx);
  const rel = relPath(bucket, task.id);

  await commit(
    companyCode,
    {
      [`${rel}/archivedAt`]: null,
      [`${rel}/archivedById`]: null,
      [`${rel}/archivedBy`]: null,
      [`${rel}/updatedAt`]: meta.now,
      [`records/${task.id}/activity/${meta.actionKey}/${meta.now}`]: {
        type: ACTIVITY_TYPE.RESTORED,
        actionBy: meta.actionBy,
      },
    },
    meta.now
  );

  return { status: 200, restored: true, changed: true };
}

/* ── Activity ── */

async function getTaskActivity({ companyCode, user, taskId }) {
  const { task } = await loadVisibleTask(companyCode, user, taskId);

  const snapshot = await db
    .ref(`${taskStore.tasksRoot(companyCode)}/records/${task.id}/activity`)
    .once("value");

  const activity = snapshot.val() || {};

  /*
  | Entries mein ids hain (kisne kiya, kisko joda) — naam saath bhejte hain.
  | targetId "kiske liye" hai (step ka person, kaun kaam par aaya); "kisne
  | kiya" path ki key hai. Field ka naam employeeId nahi rakha — page padhte
  | waqt wahi naam path ki key ke liye lagata hai, aur dono takra jaate.
  */
  const ids = Object.keys(activity);
  Object.values(activity).forEach((entries) =>
    Object.values(entries || {}).forEach((entry) => {
      ids.push(
        entry?.targetId,
        entry?.changes?.assignedTo?.from,
        entry?.changes?.assignedTo?.to,
        ...(entry?.membersAdded || []),
        ...(entry?.membersRemoved || [])
      );
    })
  );

  return {
    status: 200,
    activity,
    people: await peopleNames(companyCode, ids.filter(Boolean)),
  };
}

/* ── Team view ── */

/*
| Manager ke liye "kaun kis par kaam kar raha hai". Manager ko apne
| department ke log, HR/Owner ko sab. Employee ke liye ye view hai hi nahi
| (route par tasks.team).
|
| Har insaan: abhi kis task aur kis step par (kab se, kiske saath), aaj aur
| is hafte kitna waqt laga, aur khule, ruke, overdue, aaj poore hue kaam.
*/
async function getTeam({ companyCode, user }) {
  const ctx = await loadActor(companyCode, user);

  if (![ROLE.OWNER, ROLE.HR, ROLE.MANAGER].includes(ctx.role)) {
    fail("You do not have permission to view the team.", 403, "FORBIDDEN");
  }

  const root = taskStore.companyRoot(companyCode);
  const [employeesSnap, departmentsSnap, items, sessions] = await Promise.all([
    db.ref(`${root}/employees`).once("value"),
    db.ref(`${root}/departments`).once("value"),
    readRun(companyCode),
    taskTime.readCurrent(companyCode),
  ]);

  const employees = employeesSnap.val() || {};
  const departments = departmentsSnap.val() || {};

  const scope =
    ctx.role === ROLE.MANAGER
      ? new Set(await managerScopeIds(companyCode, user, ctx))
      : null;

  const today = todayKey();
  const tasks = items.map((item) => item.task).filter((task) => !isArchived(task));

  const members = Object.entries(employees)
    .filter(([id]) => !scope || scope.has(id))
    .filter(([, employee]) => {
      const status = employee?.account?.status;
      return !status || status === "Active";
    })
    .map(([id, employee]) => {
      const mine = tasks.filter((task) => isOnTask(task, id));
      const open = mine.filter((task) => task.status !== COMPLETED_STATUS);

      /*
      | Abhi kya chal raha hai — current (session) sabse pakki jaankari hai.
      | Purane tasks jinpar session nahi (feature se pehle shuru hue) unke
      | liye task ka working map.
      */
      const entry = sessions[id];
      const sessionTask = entry && tasks.find((task) => task.id === entry.taskId);
      const current = sessionTask
        ? {
            taskId: sessionTask.id,
            title: sessionTask.title || "",
            stepTitle: sessionTask.workingStep?.[id]?.title || "",
            since: entry.since,
            with: workingIdsOf(sessionTask).filter((other) => other !== id),
          }
        : mine
            .filter((task) => isWorkingOn(task, id))
            .map((task) => ({
              taskId: task.id,
              title: task.title || "",
              stepTitle: "",
              since: task.working?.[id] || task.updatedAt || null,
              with: workingIdsOf(task).filter((other) => other !== id),
            }))
            .sort((a, b) => (b.since || 0) - (a.since || 0))[0] || null;

      return {
        employeeId: id,
        name: employee?.personalInfo?.name || id,
        department:
          departments[employee?.employmentInfo?.departmentId]?.name || "",
        working: current,
        open: open.length,
        paused: open.filter((task) => task.status === PAUSED_STATUS).length,
        overdue: open.filter((task) => task.dueDate && task.dueDate < today).length,
        doneToday: mine.filter(
          (task) =>
            task.status === COMPLETED_STATUS &&
            todayKey(task.completedAt || task.updatedAt || 0) === today
        ).length,
        stepsOpen: mine.reduce(
          (sum, task) => sum + Number(task.subtaskOpenBy?.[id] || 0),
          0
        ),
      };
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.working)) - Number(Boolean(a.working)) ||
        b.overdue - a.overdue ||
        a.name.localeCompare(b.name)
    );

  // Aaj aur is hafte ka waqt — har insaan ka din-wise jod, aur chalta session
  const now = Date.now();
  const logs = await Promise.all(
    members.map((member) =>
      db.ref(`${taskStore.tasksRoot(companyCode)}/timeLog/${member.employeeId}`).once("value")
    )
  );
  members.forEach((member, index) => {
    Object.assign(
      member,
      taskTime.personTotals(logs[index].val() || {}, sessions[member.employeeId], now, today)
    );
  });

  const people = Object.fromEntries(members.map((member) => [member.employeeId, member.name]));

  return { status: 200, members, people };
}

/* ── Time on one task ── */

/*
| Ek task par kitna waqt — kul, insaan-wise, step-wise, aur har session.
| Jo task dekh sakta hai wahi iska waqt dekh sakta hai.
|
| Chalte sessions ka "ab tak" page khud jodta hai (open: true, startedAt) —
| server sirf band hua waqt pakka batata hai.
*/
async function getTaskTime({ companyCode, user, taskId }) {
  const { task } = await loadVisibleTask(companyCode, user, taskId);
  const recordsPath = `${taskStore.tasksRoot(companyCode)}/records/${task.id}`;

  const [sessionsSnap, stepsSnap] = await Promise.all([
    db.ref(`${recordsPath}/sessions`).once("value"),
    db.ref(`${recordsPath}/subtasks`).once("value"),
  ]);

  const sessions = Object.entries(sessionsSnap.val() || {})
    .map(([id, session]) => ({
      id,
      employeeId: session.employeeId,
      subtaskId: session.subtaskId || "",
      subtaskTitle: session.subtaskTitle || "",
      startedAt: session.startedAt,
      endedAt: session.endedAt || null,
      durationMs: session.durationMs || 0,
      endReason: session.endReason || "",
      open: !session.endedAt,
    }))
    .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

  const byPerson = {};
  const byStep = {};
  sessions.forEach((session) => {
    byPerson[session.employeeId] = (byPerson[session.employeeId] || 0) + session.durationMs;
    if (session.subtaskId) {
      byStep[session.subtaskId] = (byStep[session.subtaskId] || 0) + session.durationMs;
    }
  });

  const steps = Object.entries(stepsSnap.val() || {})
    .map(([id, step]) => ({
      id,
      title: step.title || "",
      status: subtaskStatusOf(step),
      estimateMinutes: step.estimateMinutes || 0,
      spentMs: byStep[id] || 0,
      order: step.order || step.createdAt || 0,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    status: 200,
    totalMs: sessions.reduce((sum, session) => sum + session.durationMs, 0),
    byPerson,
    steps,
    // Bahut purana task ho to bhi page bhaari na ho — haal ke 200
    sessions: sessions.slice(0, 200),
    hasSessions: sessions.length > 0,
    people: await peopleNames(companyCode, sessions.map((session) => session.employeeId)),
  };
}

module.exports = {
  getTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  setWork,
  deleteTask,
  restoreTask,
  getTaskActivity,
  getTeam,
  getTaskTime,
  // taskSubtaskService ke liye
  findVisibleTask,
  loadVisibleTask,
  assertNotArchived,
};
