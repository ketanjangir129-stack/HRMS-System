const db = require("../config/firebase");
const { ServerValue } = require("firebase-admin/database");
const taskStore = require("./taskStore");
const liveMirror = require("./liveMirror");

/*
|--------------------------------------------------------------------------
| Task Time
|--------------------------------------------------------------------------
| Kaun kis kaam par kitna waqt laga raha hai. Har "Start → Stop" ek session
| hai, aur sessions hi waqt ka hisaab hain — ginti kahin aur se nahi aati.
|
|   tasks/current/{employeeId}                      ← abhi kya chal raha hai
|       { taskId, subtaskId?, sessionId, since }
|   tasks/records/{taskId}/sessions/{sessionId}     ← har session
|       { employeeId, subtaskId?, subtaskTitle?, startedAt, endedAt?, durationMs?, endReason? }
|   tasks/run/.../{taskId}/timeSpent, timeBy/{emp}  ← list ke liye jod
|   tasks/records/{taskId}/subtasks/{id}/timeSpent  ← step ka jod
|   tasks/timeLog/{employeeId}/{YYYY-MM-DD}         ← din ka jod (Team view)
|
| Har waqt server ki ghadi ka — browser ka nahi, taaki koi apni ghadi
| badal kar ghante na badha sake.
|
| Jod ServerValue.increment se — do log ek saath ruken to ek doosre ka
| waqt overwrite nahi hota.
|
| Ek insaan ka ek hi current — naya shuru kiya to purana session yahin
| band hota hai. Isliye "ek waqt, ek kaam" ab steps par bhi lagta hai.
|--------------------------------------------------------------------------
*/

// Bhoola hua timer 10 ghante par apne aap rukta hai — wahi session 10h ka
const AUTO_STOP_MS = 10 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
// India mein DST nahi — din ki seema hamesha 18:30 UTC
const IST_OFFSET_MS = 330 * 60 * 1000;

const increment = (ms) => ServerValue.increment(ms);

/*
| Ek hi update mein ek key par do baar "jodo" likha to doosra pehle ko mita
| deta — do log ek saath ruken (task Completed hua) to ek ka waqt kho jaata.
| Isliye pehle se likha increment ho to usi mein jodte hain.
*/
const addTo = (updates, key, ms) => {
  const already = updates[key]?.[".sv"]?.increment;
  updates[key] = increment((typeof already === "number" ? already : 0) + ms);
};

// Har start/stop/status par chahiye — isliye zinda copy (liveMirror) se
const readCurrent = async (companyCode) =>
  (await liveMirror.read(`${taskStore.tasksRoot(companyCode)}/current`)) || {};

/*
| Session ko dinon mein baanto — raat 11 se subah 1 tak ka kaam do din mein
| jaata hai. { "2026-10-27": ms, "2026-10-28": ms }
*/
const splitByDay = (start, end) => {
  const pieces = {};
  let cursor = start;

  while (cursor < end) {
    const nextMidnight =
      Math.floor((cursor + IST_OFFSET_MS) / DAY_MS) * DAY_MS + DAY_MS - IST_OFFSET_MS;
    const pieceEnd = Math.min(end, nextMidnight);
    const day = taskStore.todayKey(cursor);
    pieces[day] = (pieces[day] || 0) + (pieceEnd - cursor);
    cursor = pieceEnd;
  }

  return pieces;
};

/*
| Ek chalta session band karo — updates object mein likhta hai, commit
| caller karta hai (ek hi multi-path write).
|
| entry: current/{employeeId} ki value + employeeId.
| skipTask / skipSubtask: wo record isi update mein mit raha hai — uspar
| jod likha to Firebase "ancestor path" kehkar poora write mana kar deta.
|
| Lautata hai kitna waqt juda (ms).
*/
const closeSession = (updates, entry, { endAt, reason, items = [], skipTask = false, skipSubtask = false }) => {
  const { employeeId, taskId, subtaskId, sessionId } = entry;
  const ms = Math.max(0, endAt - (entry.since || endAt));

  if (!skipTask) {
    updates[`records/${taskId}/sessions/${sessionId}/endedAt`] = endAt;
    updates[`records/${taskId}/sessions/${sessionId}/durationMs`] = ms;
    updates[`records/${taskId}/sessions/${sessionId}/endReason`] = reason;

    const item = items.find((candidate) => candidate.task.id === taskId);
    if (item) {
      const rel = taskStore.relPath(item.bucket, taskId);
      addTo(updates, `${rel}/timeSpent`, ms);
      addTo(updates, `${rel}/timeBy/${employeeId}`, ms);
      updates[`${rel}/workingStep/${employeeId}`] = null;
    }

    if (subtaskId && !skipSubtask) {
      addTo(updates, `records/${taskId}/subtasks/${subtaskId}/timeSpent`, ms);
      updates[`records/${taskId}/subtasks/${subtaskId}/workingBy/${employeeId}`] = null;
    }
  }

  Object.entries(splitByDay(entry.since || endAt, endAt)).forEach(([day, part]) => {
    addTo(updates, `timeLog/${employeeId}/${day}`, part);
  });

  updates[`current/${employeeId}`] = null;

  return ms;
};

/*
| Naya session kholo — task par (subtask khaali) ya kisi step par.
*/
const openSession = (updates, { companyCode, employeeId, task, bucket, subtask = null, now }) => {
  const sessionId = db
    .ref(`${taskStore.tasksRoot(companyCode)}/records/${task.id}/sessions`)
    .push().key;
  const rel = taskStore.relPath(bucket, task.id);

  updates[`records/${task.id}/sessions/${sessionId}`] = {
    employeeId,
    startedAt: now,
    ...(subtask ? { subtaskId: subtask.id, subtaskTitle: subtask.title || "" } : {}),
  };

  updates[`current/${employeeId}`] = {
    taskId: task.id,
    sessionId,
    since: now,
    ...(subtask ? { subtaskId: subtask.id } : {}),
  };

  updates[`${rel}/workingStep/${employeeId}`] = subtask
    ? { id: subtask.id, title: subtask.title || "" }
    : null;

  if (subtask) {
    updates[`records/${task.id}/subtasks/${subtask.id}/workingBy/${employeeId}`] = now;
  }

  return sessionId;
};

// Hafte ka Somvar — "2026-10-29" (Thu) → "2026-10-26"
const weekStartKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

/*
| Ek insaan ka aaj aur is hafte ka waqt — timeLog (band sessions) + abhi
| chal raha session, dono.
*/
const personTotals = (log = {}, entry, now, today) => {
  const week = weekStartKey(today);
  const days = { ...log };

  if (entry?.since) {
    Object.entries(splitByDay(entry.since, now)).forEach(([day, ms]) => {
      days[day] = (days[day] || 0) + ms;
    });
  }

  return Object.entries(days).reduce(
    (totals, [day, ms]) => ({
      todayMs: totals.todayMs + (day === today ? Number(ms) || 0 : 0),
      weekMs: totals.weekMs + (day >= week && day <= today ? Number(ms) || 0 : 0),
    }),
    { todayMs: 0, weekMs: 0 }
  );
};

// Is task par chal rahe saare sessions — { employeeId: entry }
const sessionsOnTask = (current, taskId, subtaskId) =>
  Object.entries(current)
    .filter(
      ([, entry]) =>
        entry?.taskId === taskId &&
        (subtaskId === undefined || entry?.subtaskId === subtaskId)
    )
    .map(([employeeId, entry]) => ({ ...entry, employeeId }));

module.exports = {
  AUTO_STOP_MS,
  readCurrent,
  splitByDay,
  weekStartKey,
  personTotals,
  closeSession,
  openSession,
  sessionsOnTask,
};
