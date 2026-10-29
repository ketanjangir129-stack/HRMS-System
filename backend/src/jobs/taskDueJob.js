const taskStore = require("../services/taskStore");
const { notifyDue, formatDate, EVENTS } = require("../services/taskNotificationService");
const {
  COMPLETED_STATUS,
  teamOf,
  isArchived,
} = require("../utils/taskRules");

/*
|--------------------------------------------------------------------------
| Task Due / Overdue Job
|--------------------------------------------------------------------------
| "Aaj due hai" aur "overdue ho gaya" — ye khabrein koi click nahi bhejta,
| waqt guzarne se banti hain. Pehle ye browser karta tha: koi Tasks page
| khole tabhi jaati thin, aur nishaan bhi browser hi likhta tha.
|
| Ab server karta hai, do tarah se:
|   1. kisi company ke tasks pehli baar maange jaayein (track) — turant
|   2. har ghante un sab companies ke liye jo server ne dekhi hain
|
| Poori "companies" node padhkar sab companies nahi nikaalte — wo poora
| database utaarna hota. Isliye list wahi hai jo requests se aati hai;
| server restart ke baad pehli request par company wapas jud jaati hai.
|
| Nishaan (notifiedDueToday / notifiedOverdue) wahi purane hain, task ke
| record par. Isliye browser se server par aane ke baad bhi koi khabar
| dobara nahi jaati.
|--------------------------------------------------------------------------
*/

const HOUR = 60 * 60 * 1000;

const NOTIFIED_FIELDS = {
  DUE_TODAY: "notifiedDueToday",
  OVERDUE: "notifiedOverdue",
};

const known = new Set();
const lastRun = new Map();
let timer = null;

/*
| Is task ko aaj kya kehna hai — null matlab kuch nahi. Frontend ke
| purane dueNotice() jaisa hi.
*/
const dueNotice = (task, today) => {
  if (!task?.id || !task?.assignedTo || !task?.dueDate) return null;
  if (task.status === COMPLETED_STATUS || isArchived(task)) return null;

  if (task.dueDate === today) {
    if (task[NOTIFIED_FIELDS.DUE_TODAY] === today) return null;

    return {
      field: NOTIFIED_FIELDS.DUE_TODAY,
      value: today,
      event: EVENTS.TASK_DUE_TODAY,
      title: "Task Due Today",
      message: `"${task.title || "A task"}" is due today.`,
    };
  }

  if (task.dueDate < today) {
    if (task[NOTIFIED_FIELDS.OVERDUE]) return null;

    return {
      field: NOTIFIED_FIELDS.OVERDUE,
      value: today,
      event: EVENTS.TASK_OVERDUE,
      title: "Task Overdue",
      message: `"${task.title || "A task"}" was due on ${formatDate(task.dueDate)}.`,
    };
  }

  return null;
};

/*
| Ek company ka ek pass. Nishaan pehle, khabar baad mein — dusra write fail
| ho to ek khabar chhootti hai, ulta hota to har ghante wahi khabar dobara.
| Nishaan ke write par meta/version nahi badalta: ye list ka badlaav nahi
| hai, aur har ghante sabke browser ko refetch karwana bekaar hai.
*/
const runCompany = async (companyCode, now = Date.now()) => {
  lastRun.set(companyCode, now);

  const today = taskStore.todayKey(now);
  const items = await taskStore.readRun(companyCode);
  const root = taskStore.tasksRoot(companyCode);
  const db = require("../config/firebase");

  let sent = 0;

  for (const { task, bucket } of items) {
    const notice = dueNotice(task, today);
    if (!notice) continue;

    try {
      await db
        .ref(`${root}/${taskStore.relPath(bucket, task.id)}`)
        .update({ [notice.field]: notice.value });
      await notifyDue(companyCode, task, notice, teamOf(task));
      sent += 1;
    } catch (error) {
      console.error("Task due notification failed:", error);
    }
  }

  return sent;
};

// Request se company dikhi — ghante mein ek baar se zyada nahi chalta
const track = (companyCode) => {
  if (!companyCode) return;
  known.add(companyCode);

  const previous = lastRun.get(companyCode) || 0;
  if (Date.now() - previous < HOUR) return;

  runCompany(companyCode).catch((error) =>
    console.error("Task due sweep failed:", error)
  );
};

const start = () => {
  if (timer) return;

  timer = setInterval(() => {
    known.forEach((companyCode) =>
      runCompany(companyCode).catch((error) =>
        console.error("Task due sweep failed:", error)
      )
    );
  }, HOUR);

  // Server band karte waqt ye timer use roke na rakhe
  timer.unref?.();
};

module.exports = {
  NOTIFIED_FIELDS,
  dueNotice,
  runCompany,
  track,
  start,
};
