import {
  addSubtaskApi,
  createTaskApi,
  deleteSubtaskApi,
  deleteTaskApi,
  getSubtaskAssigneesApi,
  getSubtasksApi,
  getTaskActivityApi,
  getTaskApi,
  getTaskTeamApi,
  getTaskTimeApi,
  restoreTaskApi,
  setTaskWorkApi,
  updateSubtaskApi,
  updateTaskApi,
  updateTaskStatusApi,
} from "./api/taskApi";

import { db } from "../firebase/firebase";
import { ref, onValue } from "firebase/database";

/*
| Paused "In Progress" aur "Completed" ke beech mein hai — ek shuru kiya hua
| kaam jo abhi rok diya gaya. Order isi tarah rehna chahiye: COMPLETED_STATUS
| aakhri element se nikalta hai, aur filter/progress bar isi kram mein dikhte
| hain.
*/
export const TASK_STATUSES = ["To Do", "In Progress", "Paused", "Completed"];

// Naya task hamesha pehle status se shuru hota hai
export const DEFAULT_TASKS_STATUS = TASK_STATUSES[0];

// Ek insaan ek waqt par ek hi task par kaam karta hai — doosra shuru karte
// hi uska purana kaam rukta hai (server tay karta hai)
export const IN_PROGRESS_STATUS = TASK_STATUSES[1];

export const PAUSED_STATUS = TASK_STATUSES[2];

// Aakhri status — "pending hai ya nahi" ka check isi se hota hai
export const COMPLETED_STATUS = TASK_STATUSES[TASK_STATUSES.length - 1];

/*
| Activity entry kis baat ki hai. Ye values Firebase mein likhi jaati hain
| (backend utils/taskRules.js mein wahi list) — kabhi badalni nahi hain.
| Purani entries mein type hai hi nahi; taskUtils unhe purane tareeke se
| pehchaanta hai.
*/
export const ACTIVITY_TYPE = {
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
};

/*
|--------------------------------------------------------------------------
| List kahan se aati hai
|--------------------------------------------------------------------------
| Pehle browser tasks/run poora utaarta tha aur doosron ke tasks khud
| chhupata tha — Employee ke network tab mein poori company ke tasks hote
| the. Ab list API se aati hai, aur server sirf wahi bhejta hai jo is user
| ko dikhna chahiye.
|
| Realtime ke liye sirf ek chhota number sunte hain:
|
|   companies/{code}/tasks/meta/version
|
| Server har write par ise badalta hai. Badla to list dobara maang lete
| hain — kisi doosre user ka badlaav bhi bina refresh dikh jaata hai.
|
| Agar Firebase rules is number ko padhne na dein to har 30 second mein
| khud maang lete hain. Page tab bhi chalta hai, bas thoda der se.
|--------------------------------------------------------------------------
*/
const versionPath = (companyCode) => `companies/${companyCode}/tasks/meta/version`;

const FALLBACK_POLL_MS = 30000;

/*
| Server ka jawab ya galti. Galti mein server ka hi message aur code aata hai
| (jaise CONFLICT), taaki page user ko sahi baat bata sake.
*/
const unwrap = (result, fallbackMessage) => {
  if (!result || result.success === false) {
    const error = new Error(result?.message || fallbackMessage);
    error.code = result?.code;
    throw error;
  }
  return result;
};

/*
| meta/version badalne par onChange. Return hone wala function sunna band
| karta hai — useEffect ke cleanup mein zaroor chalana.
*/
export const subscribeTaskVersion = (companyCode, onChange) => {
  let timer = null;

  const stop = onValue(
    ref(db, versionPath(companyCode)),
    () => onChange(),
    () => {
      onChange();
      timer = setInterval(onChange, FALLBACK_POLL_MS);
    }
  );

  return () => {
    stop();
    if (timer) clearInterval(timer);
  };
};

/*
| Wahi signature jo pehle tha — (companyCode, onData, onError) aur band
| karne wala function. onData ab doosra argument bhi deta hai: people
| ({ id: naam }), taaki teammates ke naam bina employees list ke dikhein.
|
| Ek request chalte hue doosra badlaav aaye to wo line mein lagta hai —
| purana jawab naye ke baad aakar list ko peeche nahi le jaata.
*/
export const subscribeTasks = (companyCode, onData, onError, { archived = false } = {}) => {
  let active = true;
  let inFlight = false;
  let queued = false;

  const load = async () => {
    // Band ho chuka — koi request nahi
    if (!active) return;

    if (inFlight) {
      queued = true;
      return;
    }

    inFlight = true;

    try {
      const result = unwrap(await getTaskApi({ archived }), "Unable to load tasks.");
      if (active) onData(result.tasks || [], result.people || {});
    } catch (error) {
      if (active) onError?.(error);
    } finally {
      inFlight = false;
      if (queued && active) {
        queued = false;
        load();
      }
    }
  };

  const stop = subscribeTaskVersion(companyCode, load);

  return () => {
    active = false;
    stop();
  };
};

/*
| Naya task. members optional — team ke baaki log. createdBy/createdById
| server khud token se likhta hai; browser ka bheja naam ab nahi chalta.
*/
export const createTask = async (companyCode, task) => {
  const result = unwrap(
    await createTaskApi({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      priority: task.priority,
      members: task.members || [],
    }),
    "Unable to create the task."
  );

  return result.task;
};

/*
| Edit — sirf jo fields bheji wahi badalti hain. expectedUpdatedAt wo
| updatedAt hai jo form kholte waqt tha; beech mein kisi aur ne badla ho
| to server CONFLICT lautata hai aur page "reload karo" bolta hai.
*/
export const updateTask = async (companyCode, taskId, changes) =>
  unwrap(await updateTaskApi(taskId, changes), "Unable to update the task.");

/*
| Status change. { changed, paused } lautata hai — paused un tasks ke naam
| jinpar is insaan ka kaam apne aap ruka, taaki page bata sake.
*/
export const updateTaskStatus = async (companyCode, task, status) => {
  if (!task?.id) return { changed: false, paused: [] };

  const result = unwrap(
    await updateTaskStatusApi(task.id, status),
    "Unable to update task status."
  );

  return {
    changed: result.changed !== false,
    paused: result.paused || [],
    // Paused chuna par team ke baaki kaam kar rahe the — sirf mera kaam ruka
    onlyMine: Boolean(result.onlyMine),
  };
};

/*
| Team ka ek insaan — "main is par kaam kar raha hoon / ruk gaya". subtaskId
| diya to kaam us step par (waqt step ke khaate mein bhi judta hai).
*/
export const setTaskWork = async (task, action, subtaskId) => {
  const result = unwrap(
    await setTaskWorkApi(task.id, action, subtaskId),
    "Unable to update your work."
  );
  return { changed: result.changed !== false, paused: result.paused || [] };
};

/*
| Ek task ka waqt. Chalte sessions (open: true) ka "ab tak" page khud jodta
| hai — server sirf band hua waqt pakka batata hai.
*/
export const fetchTaskTime = async (taskId) => {
  const result = unwrap(await getTaskTimeApi(taskId), "Unable to load time.");
  return {
    totalMs: result.totalMs || 0,
    byPerson: result.byPerson || {},
    steps: result.steps || [],
    sessions: result.sessions || [],
    hasSessions: Boolean(result.hasSessions),
    people: result.people || {},
  };
};

// Delete ab archive hai — task aur history bachi rehti hai
export const archiveTask = async (task) =>
  unwrap(await deleteTaskApi(task.id), "Unable to archive the task.");

export const restoreTask = async (task) =>
  unwrap(await restoreTaskApi(task.id), "Unable to restore the task.");

// Hamesha ke liye — sirf Owner. Task aur uski poori history jaati hai
export const deleteTaskPermanently = async (task) =>
  unwrap(await deleteTaskApi(task.id, { permanent: true }), "Unable to delete the task.");

export const fetchTaskActivity = async (taskId) => {
  const result = unwrap(await getTaskActivityApi(taskId), "Unable to load activity.");
  return { activity: result.activity || {}, people: result.people || {} };
};

export const fetchTaskTeam = async () => {
  const result = unwrap(await getTaskTeamApi(), "Unable to load the team.");
  return result.members || [];
};

/* ── Steps (subtasks) ── */

export const fetchSubtasks = async (taskId) => {
  const result = unwrap(await getSubtasksApi(taskId), "Unable to load steps.");
  return {
    subtasks: result.subtasks || [],
    people: result.people || {},
    canAdd: Boolean(result.canAdd),
  };
};

export const fetchSubtaskAssignees = async (taskId) => {
  const result = unwrap(await getSubtaskAssigneesApi(taskId), "Unable to load people.");
  return { onTask: result.onTask || [], others: result.others || [] };
};

export const addSubtask = async (taskId, subtask) =>
  unwrap(await addSubtaskApi(taskId, subtask), "Unable to add the step.");

export const updateSubtask = async (taskId, subtaskId, changes) =>
  unwrap(await updateSubtaskApi(taskId, subtaskId, changes), "Unable to update the step.");

export const removeSubtask = async (taskId, subtaskId) =>
  unwrap(await deleteSubtaskApi(taskId, subtaskId), "Unable to remove the step.");
