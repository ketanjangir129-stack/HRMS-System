const db = require("../config/firebase");
const liveMirror = require("./liveMirror");
const roleAccessService = require("./roleAccessService");
const { hasPermission } = require("../utils/permissions");
const {
  DEFAULT_TIMEZONE,
  getDateKey,
  getMonthPath,
} = require("../utils/attendanceDate");
const {
  ROLE,
  SUBTASK_IN_PROGRESS,
  SUBTASK_PAUSED,
  subtaskStatusOf,
} = require("../utils/taskRules");

/*
|--------------------------------------------------------------------------
| Task Store
|--------------------------------------------------------------------------
| Tasks ka Firebase wala hissa — padhna, dhoondhna, likhna. taskService aur
| taskSubtaskService dono isi se guzarte hain, isliye path aur "task kahan
| padi hai" ka jawab ek hi jagah hai.
|
|   companies/{code}/tasks/run/...                 ← live tasks (3 shakal)
|   companies/{code}/tasks/index/{taskId}          ← task kis khaane mein hai
|   companies/{code}/tasks/records/{taskId}/...    ← activity, subtasks, sessions
|   companies/{code}/tasks/meta/version            ← har write par badalta hai
|
| meta/version browser ke liye ek chhota sa ishaara hai: list ab API se aati
| hai (poora run node browser mein nahi utarta), aur page sirf is ek number
| ko sunta hai — badla to list dobara maang leta hai.
|--------------------------------------------------------------------------
*/

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

const tasksRoot = (companyCode) => `${companyRoot(companyCode)}/tasks`;

// Company ka "aaj" — server ki ghadi ka nahi
const todayKey = (now = Date.now()) => getDateKey(now, DEFAULT_TIMEZONE);

/* ── Khaana (bucket) ── */

const YEAR_KEY = /^\d{4}$/;
const UNDATED_NODE = "undated";

/*
| Index mein legacy khaana ("" — run/{taskId}) seedha khaali string ki tarah
| nahi rakhte; ek saaf nishaan rakhte hain taaki "index hai hi nahi" aur
| "index hai, legacy hai" alag pehchane jaayein.
*/
const LEGACY_INDEX = "_legacy";

const isTaskNode = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  ("title" in value || "status" in value || "createdAt" in value);

// Naya task us din ke khaane mein jaata hai jis din diya gaya
const taskBucket = (dateKey) => {
  const monthPath = getMonthPath(dateKey);
  return monthPath ? `${monthPath}/${dateKey}` : UNDATED_NODE;
};

const relPath = (bucket, taskId) =>
  bucket ? `run/${bucket}/${taskId}` : `run/${taskId}`;

/*
| Poora run node ek seedhi list — har task ke saath uska khaana. Ek hi id
| do jagah mile to dated wali jeetti hai (frontend ka purana flattenRun bhi
| yahi karta tha).
*/
const listRun = (run) => {
  const found = new Map();

  const add = (id, task, bucket, dated) => {
    if (!id || !isTaskNode(task)) return;
    if (found.has(id) && !dated) return;
    found.set(id, { task: { ...task, id }, bucket });
  };

  Object.entries(run || {}).forEach(([key, value]) => {
    if (isTaskNode(value)) {
      add(key, value, "", false);
      return;
    }

    if (key === UNDATED_NODE) {
      Object.entries(value || {}).forEach(([id, task]) =>
        add(id, task, UNDATED_NODE, true)
      );
      return;
    }

    if (YEAR_KEY.test(key)) {
      Object.entries(value || {}).forEach(([month, days]) =>
        Object.entries(days || {}).forEach(([day, node]) =>
          Object.entries(node || {}).forEach(([id, task]) =>
            add(id, task, `${key}/${month}/${day}`, true)
          )
        )
      );
    }
  });

  return [...found.values()].sort(
    (a, b) => (b.task.createdAt || 0) - (a.task.createdAt || 0)
  );
};

/*
| run aur index server ki zinda copy (liveMirror) se — har action par poora
| run Firebase se dobara utaarna band. Pehli baar ek download, phir sirf
| badlaav.
*/
const runSnapshot = (companyCode) => liveMirror.snapshot(`${tasksRoot(companyCode)}/run`);

const readRun = async (companyCode) => listRun((await runSnapshot(companyCode)).val());

/*
| Ek task dhoondo. Pehle index se seedha uski jagah (memory mein, poora run
| parse kiye bina), na mile to poora run scan karke index bhar dete hain —
| purane tasks ka index pehli baar chhoone par apne aap ban jaata hai.
*/
const findTask = async (companyCode, taskId) => {
  const id = String(taskId || "").trim();
  if (!id || /[.#$[\]/]/.test(id)) return null;

  const root = tasksRoot(companyCode);
  const [indexSnap, runSnap] = await Promise.all([
    liveMirror.snapshot(`${root}/index`),
    runSnapshot(companyCode),
  ]);

  if (indexSnap.child(id).exists()) {
    const stored = indexSnap.child(id).val();
    const bucket = stored === LEGACY_INDEX ? "" : String(stored || "");
    const task = runSnap.child(bucket ? `${bucket}/${id}` : id).val();

    if (isTaskNode(task)) {
      return { task: { ...task, id }, bucket };
    }
  }

  const found = listRun(runSnap.val()).find((item) => item.task.id === id);

  if (found) {
    await db
      .ref(`${root}/index/${id}`)
      .set(found.bucket || LEGACY_INDEX);
  }

  return found || null;
};

const indexValue = (bucket) => bucket || LEGACY_INDEX;

/* ── Kaun hai ── */

/*
| Request wale user ka task-context: role, uski id, aur can(path).
| Owner ke liye id hamesha "owner" — wahi key jo createdById aur activity
| mein jaati hai.
*/
const loadActor = async (companyCode, user) => {
  const role = String(user?.role || "").trim().toLowerCase();
  const actorId =
    role === ROLE.OWNER ? "owner" : String(user?.employeeId || "").trim();

  if (!role || !actorId) {
    fail("Please sign in again to continue.", 401, "UNAUTHORIZED");
  }

  const stored =
    role === ROLE.OWNER
      ? null
      : await roleAccessService.getRoleAccessForRole(companyCode, role);

  return {
    role,
    actorId,
    can: (path) => role === ROLE.OWNER || hasPermission(stored, role, path),
  };
};

const actorName = async (companyCode, ctx) => {
  if (ctx.role !== ROLE.OWNER) {
    const snapshot = await db
      .ref(`${companyRoot(companyCode)}/employees/${ctx.actorId}/personalInfo/name`)
      .once("value");
    return snapshot.val() || ctx.actorId;
  }

  const snapshot = await db.ref(`${companyRoot(companyCode)}/details`).once("value");
  const details = snapshot.val() || {};
  return details.ownerName || details.name || "Admin";
};

/*
| Ek employee ki pehchaan — maujood hai ya nahi, role aur naam. Poora
| employee record nahi utaarte (usme documents, salary sab hota hai), sirf
| do chhoti fields.
*/
const loadPerson = async (companyCode, employeeId) => {
  const id = String(employeeId || "").trim();
  if (!id || /[.#$[\]/]/.test(id)) return null;

  const base = `${companyRoot(companyCode)}/employees/${id}`;
  const [accountSnap, nameSnap] = await Promise.all([
    db.ref(`${base}/account`).once("value"),
    db.ref(`${base}/personalInfo/name`).once("value"),
  ]);

  if (!accountSnap.exists() && !nameSnap.exists()) {
    const employment = await db.ref(`${base}/employmentInfo`).once("value");
    if (!employment.exists()) return null;
  }

  const account = accountSnap.val() || {};

  return {
    id,
    name: nameSnap.val() || id,
    role: String(account.role || "").trim().toLowerCase(),
  };
};

/*
| { id: naam } — list aur activity ke liye. Owner ka naam company details se.
|
| Naam paanch minute yaad rakhte hain: list har badlaav par dobara maangi
| jaati hai, aur har baar har naam padhna bekaar hai. Naam badalna itna
| kam hota hai ki paanch minute ki deri koi farak nahi daalti.
*/
const NAME_TTL = 5 * 60 * 1000;
const nameCache = new Map();

const peopleNames = async (companyCode, ids = []) => {
  const unique = [...new Set(ids.filter(Boolean))];
  const now = Date.now();

  const pairs = await Promise.all(
    unique.map(async (id) => {
      const key = `${companyCode}/${id}`;
      const cached = nameCache.get(key);
      if (cached && now - cached.at < NAME_TTL) return [id, cached.name];

      const name =
        id === "owner"
          ? await actorName(companyCode, { role: ROLE.OWNER, actorId: id })
          : (await loadPerson(companyCode, id))?.name || id;

      nameCache.set(key, { name, at: now });
      return [id, name];
    })
  );

  return Object.fromEntries(pairs);
};

const clearNameCache = () => nameCache.clear();

/*
| Manager ke department ke log. Wahi check jo Attendance aur Leave karte
| hain (getAccessibleEmployeeIds), isliye "mera department" teeno module
| mein ek hi matlab rakhta hai. Lazy require — attendanceService bhaari hai
| aur sirf manager ke subtask/team kaam mein chahiye.
*/
const managerScopeIds = async (companyCode, user, ctx) => {
  if (ctx.role !== ROLE.MANAGER) return [];

  try {
    const { getAccessibleEmployeeIds } = require("./attendanceService");
    return await getAccessibleEmployeeIds(companyCode, user);
  } catch (error) {
    console.error("Task manager scope failed:", error);
    return [];
  }
};

/*
| Task Paused hua to uske "In Progress" steps bhi Paused — warna step chalta
| dikhta jabki task par koi kaam hi nahi kar raha. To Do aur Done waise hi.
| Timer (workingBy, timeSpent) yahan nahi chhoote — wo session band karne
| wala (closeSession) pehle hi sambhalta hai; yahan sirf status.
|
| updates mein likhta hai, commit caller karta hai — task ka status aur
| steps ka status ek hi write mein, beech ki haalat kabhi nahi dikhti.
|
| only: { employeeId, subtaskId } — poora task nahi, sirf ek insaan ruka
| (team ke baaki kaam kar rahe hain). Tab sirf uske steps: jis step par wo
| kaam kar raha tha (subtaskId), aur jo step usi ke naam hai. Jis step par
| koi aur abhi kaam kar raha hai wo nahi rukta — wo uska kaam hai.
*/
const pauseRunningSteps = async (companyCode, taskIds, updates, now, only = null) => {
  const ids = [...new Set(taskIds.filter(Boolean))];
  if (!ids.length) return;

  const snapshots = await Promise.all(
    ids.map((id) => db.ref(`${tasksRoot(companyCode)}/records/${id}/subtasks`).once("value"))
  );

  snapshots.forEach((snapshot, index) => {
    Object.entries(snapshot.val() || {}).forEach(([stepId, step]) => {
      if (subtaskStatusOf(step) !== SUBTASK_IN_PROGRESS) return;

      if (only) {
        const mine = stepId === only.subtaskId || step.assignedTo === only.employeeId;
        const othersOnIt = Object.keys(step.workingBy || {}).some((id) => id !== only.employeeId);
        if (!mine || othersOnIt) return;
      }

      const stepPath = `records/${ids[index]}/subtasks/${stepId}`;

      // Isi write mein ye step pehle se badal raha hai (user ne Done kiya,
      // ya step/task mit raha hai) — uski baat pehle, yahan haath nahi
      const statusPath = `${stepPath}/status`;
      const alreadyWritten = Object.keys(updates).some(
        (key) => key === statusPath || statusPath.startsWith(`${key}/`)
      );
      if (alreadyWritten) return;

      updates[statusPath] = SUBTASK_PAUSED;
      updates[`${stepPath}/updatedAt`] = now;
    });
  });
};

// Firebase key mein . # $ [ ] / nahi chalte
const activityKey = (value) => String(value || "").replace(/[.#$[\]/]/g, "_");

/*
| Saare writes yahin se — ek multi-path update, aur saath mein meta/version.
| Ya sab likha jaata hai ya kuch nahi.
*/
const commit = async (companyCode, updates, now = Date.now()) => {
  await db.ref(tasksRoot(companyCode)).update({
    ...updates,
    "meta/version": now,
  });
};

module.exports = {
  fail,
  companyRoot,
  tasksRoot,
  todayKey,
  isTaskNode,
  taskBucket,
  relPath,
  listRun,
  readRun,
  findTask,
  indexValue,
  loadActor,
  actorName,
  loadPerson,
  peopleNames,
  clearNameCache,
  managerScopeIds,
  pauseRunningSteps,
  activityKey,
  commit,
  LEGACY_INDEX,
};
