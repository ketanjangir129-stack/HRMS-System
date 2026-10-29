const taskStore = require("../services/taskStore");
const taskTime = require("../services/taskTime");
const {
  ACTIVITY_TYPE,
  IN_PROGRESS_STATUS,
  PAUSED_STATUS,
  workingIdsOf,
} = require("../utils/taskRules");

/*
|--------------------------------------------------------------------------
| Task Work Job — bhoole hue timer
|--------------------------------------------------------------------------
| Koi "Start" daba kar ghar chala jaye to timer raat bhar chalta aur ghante
| jhoothe ho jaate. Isliye 10 ghante se purana session apne aap band hota
| hai — aur band hone ka waqt theek since + 10h likha jaata hai, job chahe
| thodi der baad chale. Session par endReason "auto" — manager dekh sakta
| hai ki ye apne aap ruka tha.
|
| Waqt haath se theek karne ki suvidha jaan-boojhkar nahi hai — sirf jo
| sessions record hue wahi gine jaate hain.
|
| Companies wahi jo requests mein dikhi (taskDueJob jaisa) — har 15 minute.
|--------------------------------------------------------------------------
*/

const EVERY = 15 * 60 * 1000;

const known = new Set();
let timer = null;

const runCompany = async (companyCode, now = Date.now()) => {
  const current = await taskTime.readCurrent(companyCode);

  const expired = Object.entries(current)
    .map(([employeeId, entry]) => ({ ...entry, employeeId }))
    .filter((entry) => entry.since && now - entry.since >= taskTime.AUTO_STOP_MS);

  if (!expired.length) return 0;

  const items = await taskStore.readRun(companyCode);
  const updates = {};
  // Ek task par kai log ho sakte hain — working map task-wise ek baar likho
  const workingLeft = new Map();

  expired.forEach((entry) => {
    const endAt = entry.since + taskTime.AUTO_STOP_MS;
    taskTime.closeSession(updates, entry, { endAt, reason: "auto", items });

    const item = items.find((candidate) => candidate.task.id === entry.taskId);
    if (!item) return;

    const left = workingLeft.get(item.task.id) || workingIdsOf(item.task);
    workingLeft.set(item.task.id, left.filter((id) => id !== entry.employeeId));

    updates[`records/${item.task.id}/activity/${taskStore.activityKey(entry.employeeId)}/${endAt}`] = {
      type: ACTIVITY_TYPE.WORK_STOPPED,
      actionBy: "System",
      targetId: entry.employeeId,
      auto: true,
      message: "Stopped automatically after 10 hours of work",
    };
  });

  const pausedIds = [];

  workingLeft.forEach((left, taskId) => {
    const { task, bucket } = items.find((candidate) => candidate.task.id === taskId);
    const rel = taskStore.relPath(bucket, taskId);
    const working = Object.fromEntries(
      left.map((id) => [id, task.working?.[id] || task.updatedAt || now])
    );

    updates[`${rel}/working`] = left.length ? working : null;
    updates[`${rel}/updatedAt`] = now;

    // Koi bacha hi nahi to task ruk gaya
    if (!left.length && task.status === IN_PROGRESS_STATUS) {
      updates[`${rel}/status`] = PAUSED_STATUS;
      pausedIds.push(taskId);
    }
  });

  // Task apne aap ruka — uske chalte steps bhi
  await taskStore.pauseRunningSteps(companyCode, pausedIds, updates, now);
  await taskStore.commit(companyCode, updates, now);
  return expired.length;
};

const track = (companyCode) => {
  if (companyCode) known.add(companyCode);
};

const start = () => {
  if (timer) return;

  timer = setInterval(() => {
    known.forEach((companyCode) =>
      runCompany(companyCode).catch((error) =>
        console.error("Task auto-stop failed:", error)
      )
    );
  }, EVERY);

  timer.unref?.();
};

module.exports = { runCompany, track, start };
