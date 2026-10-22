import {
  createTaskApi,
  deleteTaskApi,
  updateTaskApi,
  updateTaskStatusApi,
} from "./api/taskApi";


import {db} from "../firebase/firebase";
import {ref, onValue, update} from "firebase/database";
import {
  notifyTaskAssigned,
  notifyTaskReassigned,
  notifyTaskStatusChanged,
  notifyTaskUpdated,
} from "./notifications/taskNotificationService";

/*
| Paused "In Progress" aur "Completed" ke beech mein hai — ek shuru kiya hua
| kaam jo abhi rok diya gaya. Order isi tarah rehna chahiye: COMPLETED_STATUS
| aakhri element se nikalta hai, aur filter/progress bar isi kram mein dikhte
| hain.
*/
export const TASK_STATUSES = ["To Do", "In Progress", "Paused", "Completed"];

// Naya task hamesha pehle status se shuru hota hai
export const DEFAULT_TASKS_STATUS = TASK_STATUSES[0];

// Ek employee ke paas ek hi task ye status rakh sakta hai — doosra start
// karte hi purana PAUSED_STATUS par chala jaata hai
export const IN_PROGRESS_STATUS = TASK_STATUSES[1];

export const PAUSED_STATUS = TASK_STATUSES[2];

// Aakhri status — "pending hai ya nahi" ka check isi se hota hai
export const COMPLETED_STATUS = TASK_STATUSES[TASK_STATUSES.length - 1];

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
| Do hisse — "abhi kya haal hai" aur "ab tak kya hua":
|
|   companies/{code}/tasks/run/{taskId}                                  ← live task
|   companies/{code}/tasks/records/{taskId}/activity/{employeeId}/{ts}   ← history
|
| Alag rakhne ki wajah: task list har page par realtime chalti hai, par
| history sirf tab chahiye jab koi Activity kholta hai. Pehle activity task
| ke andar hi padi thi, isliye har listener har entry bhi utaarta tha —
| jitni purani history, utni bhaari list.
|
| tasksPath multi-path update ki jad hai: ek hi update() mein "run/..." aur
| "records/..." dono keys ja sakti hain, isliye status aur uski entry kabhi
| alag nahi ho sakte.
|
| Naya task us din ke khaane mein likha jaata hai jis din wo diya gaya, aur
| phir kabhi hilta nahi. Purane tasks jahan hain wahin rehte hain. Kaunsa
| khaana, ye taskBucket/resolveBucket tay karte hain — dekho neeche.
*/
const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const runPath = (companyCode) => `${tasksPath(companyCode)}/run`;
const taskActivityPath = (companyCode, taskId) =>
  `${tasksPath(companyCode)}/records/${taskId}/activity`;

/*
|--------------------------------------------------------------------------
| Khaana (Bucket)
|--------------------------------------------------------------------------
| "Khaana" wo hissa hai jo run aur taskId ke beech aata hai:
|
|   ""                          → run/{taskId}                  legacy
|   "undated"                   → run/undated/{taskId}
|   "2026/August/2026-08-19"    → run/2026/August/{date}/{taskId}
|
| Legacy ka khaana khaali string hai, koi naam nahi: wahan beech mein kuch
| hai hi nahi. Isliye har jagah `bucket ? ... : ...` chalta hai.
*/
const LEGACY_BUCKET = "";

/*
| Bina din wale tasks ka khaana. Na saal jaisa dikhta hai (/^\d{4}$/), na
| push key jaisa (wo "-" se shuru hoti hai), isliye kisi aur node se confuse
| nahi ho sakta.
|
| Naye tasks yahan practically aate nahi — assign hone ka din hamesha aaj hai
| aur aaj ki key hamesha theek hoti hai. Par ye node ab bhi ek asli jagah
| hai: purane tasks jinki koi due date nahi thi wo isi mein pade hain, jab
| tak khaana dueDate se banta tha.
|
| Taareef yahan upar hai kyunki taskBucket() iski pehli graahak hai —
| padhne wale ko neeche tak jaana na pade.
*/
const UNDATED_NODE = "undated";



/*
| Task ka path, tasksPath ke sapeksh. Multi-path update ki keys isi se
| banti hain — wahi kaam jo attendance mein dayPath() karta hai.
*/
const taskRelPath = (bucket, taskId) =>
  bucket ? `run/${bucket}/${taskId}` : `run/${taskId}`;

const taskPath = (companyCode, bucket, taskId) =>
  `${tasksPath(companyCode)}/${taskRelPath(bucket, taskId)}`;

/*
|--------------------------------------------------------------------------
| Task Kahan Padi Hai
|--------------------------------------------------------------------------
| Likhne ke liye ye jaanna zaroori hai ki task is waqt kis khaane mein hai,
| aur wo baat sirf padhte waqt pata chalti hai — record ke andar to hai
| nahi. Isliye flattenRun har task par uska khaana chipka deta hai.
|
| Ye field UI ke liye nahi hai aur Firebase mein kabhi nahi jaati:
| stripReadFields har us jagah se hata deti hai jahan poora record likha
| jaata hai. Naam "__" se shuru hota hai taaki dekhte hi pata chale ki ye
| record ka hissa nahi hai.
|
| Iske bina task ke dueDate se khaana andaza karna padta, aur wo sabse
| khatarnaak galti hoti: ek legacy task jiska dueDate "2026-08-19" hai wo
| padi hai run/{taskId} par, par andaza kehta run/2026/August/... — likhai
| khaali jagah par chali jaati aur asli task wahin ka wahin pada rehta.
| Isliye resolveBucket sirf isi field par bharosa karta hai, aur na mile to
| legacy maan leta hai — bilkul wahi jagah jahan aaj sab kuch likha jaata
| hai.
*/
const BUCKET_FIELD = "__taskBucket";

const resolveBucket = (task) =>
  task && BUCKET_FIELD in task ? task[BUCKET_FIELD] : LEGACY_BUCKET;

/*
| Padhne ke waqt joda gaya hissa record se hata do.
|
| Sirf BUCKET_FIELD jaata hai. id yahan se nahi hatti: naye records mein wo
| hoti hi nahi, par kuch purane records mein andar padi hai (pehle store
| hoti thi), aur move karte waqt use gira dena us record se ek maujooda
| field cheen lena hoga.
*/
const stripReadFields = (task) => {
  const persisted = { ...task };

  delete persisted[BUCKET_FIELD];

  return persisted;
};



/*
|--------------------------------------------------------------------------
| Run Node → Task List
|--------------------------------------------------------------------------
| Firebase object deta hai, page ko array chahiye.
| { "-Nx8": {...} }  →  [ { id: "-Nx8", ... } ]
|
| run ke neeche teen shakal ho sakti hain, aur padhne wala teenon samajhta
| hai:
|
|   run/{taskId}                               ← legacy
|   run/{year}/{Month}/{YYYY-MM-DD}/{taskId}   ← assign hone ke din wale
|   run/undated/{taskId}                       ← bina din wale
|
| Naya task apne khaane mein hi likha jaata hai (createTask) aur phir kabhi
| hilta nahi — khaana assign hone ke din ka hai, aur wo din badalta nahi.
| Purane tasks jahan hain wahin rehte hain: koi migration nahi chalti.
|
| Wo purane tasks apni DUE date ke khaane mein pade ho sakte hain — jab tak
| khaana dueDate se banta tha. Padhne mein isse kuch nahi badalta: neeche
| ka flattenRun teenon shakalon ko ek jaisa uthata hai, aur likhne wala
| khaana kabhi andaza nahi lagata (BUCKET_FIELD, dekho upar). Bas Firebase
| console mein ek hi date node ke neeche dono matlab baith sakte hain.
|
| Bahar nikalne wala task pehle jaisa hi hai — { ...task, id } — bas uspar
| ek chhupa hua BUCKET_FIELD aur chipak jaata hai, taaki likhne wale ko
| khaana dobara dhoondhna na pade. Wo field Firebase mein kabhi nahi jaati:
| stripReadFields har poore record ke write se pehle use hata deti hai.
*/

const YEAR_KEY = /^\d{4}$/;

/*
| Ye node khud ek task hai, ya uspar aur khaane hain?
|
| Wahi tarika leaveService ka isRequestNode() bhi apnata hai — shakal se
| pehchano, key se nahi. status aur createdAt service khud likhti hai
| (createTask), aur title ke bina task banta hi nahi; teenon mein se ek bhi
| mil jaye to ye task hai.
|
| "2026", "August", "2026-08-19" aur "undated" — in sab par inme se koi
| field hoti hi nahi, isliye structural node kabhi task nahi maana jaata.
*/
const isTaskNode = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  ("title" in value || "status" in value || "createdAt" in value);

/*
| Ek task list mein daalo.
|
| id spread ke BAAD hai, isliye Firebase ki key hamesha jeetti hai. Purane
| records mein id andar bhi padi hai (pehle store hoti thi) — agar wo kabhi
| key se alag ho jaye to key hi sahi maani jaayegi.
|
| bucket wahi jagah hai jahan se task mila — legacy ke liye khaali string.
| Wo task par chipak kar jaata hai (BUCKET_FIELD) taaki baad mein likhne
| wale ko dhoondhna na pade; record mein wo kabhi nahi jaata.
|
| Khaali string bhi ek valid khaana hai, isliye "mila ya nahi" ka faisla
| falsy-ness se nahi hota — dated se hota hai. Ek hi id dono jagah mil jaye
| to nayi jagah wala rehta hai aur legacy wala chup-chaap chhoot jaata hai:
| list mein task ek hi baar aata hai, chahe padhne ka kram kuch bhi ho.
| Firebase mein isse kuch badalta nahi; ye sirf padhne ka faisla hai.
*/
const addTask = (tasks, id, task, bucket, dated) => {
  if (!id || !isTaskNode(task)) return;

  if (tasks.has(id) && !dated) return;

  tasks.set(id, { ...task, id, [BUCKET_FIELD]: bucket });
};

// Ek khaana — taskId → task
const addBucket = (tasks, node, bucket, dated) => {
  Object.entries(node || {}).forEach(([id, task]) =>
    addTask(tasks, id, task, bucket, dated)
  );
};

/*
| Poora run node ek seedhi list ban jaata hai.
|
| Har child pehle "tu khud task hai kya" se guzarta hai aur uske baad hi
| structural node maana jaata hai. Isse wo taskId bhi surakshit rehti hai jo
| galti se saal jaisi dikhti ho.
|
| Jo teenon mein se kisi shakal mein na baithe use chhod diya jaata hai: ek
| anjaan node poori list le doobe, ye theek nahi.
*/
const flattenRun = (run) => {
  const tasks = new Map();

  Object.entries(run || {}).forEach(([key, value]) => {
    if (isTaskNode(value)) {
      addTask(tasks, key, value, LEGACY_BUCKET, false);
      return;
    }

    if (key === UNDATED_NODE) {
      addBucket(tasks, value, UNDATED_NODE, true);
      return;
    }

    if (YEAR_KEY.test(key)) {
      // year → Month → YYYY-MM-DD → taskId
      Object.entries(value || {}).forEach(([month, days]) =>
        Object.entries(days || {}).forEach(([day, node]) =>
          addBucket(tasks, node, `${key}/${month}/${day}`, true)
        )
      );
    }
  });

  // New task sbse upar -createdAt jitna bada , utna new
  return [...tasks.values()].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
};

// Realtime listener — jab bhi tasks badlein, onData dobara chalta hai.
// Doosre user ka banaya task bhi bina refresh dikh jaayega.
//
// Return hone wala function listener band karta hai — use useEffect ke
// cleanup mein zaroor chalana, warna page chhodne ke baad bhi listener
// chalta rehta hai (memory leak).
export const subscribeTasks = (companyCode, onData, onError) =>
  onValue(
    ref(db, runPath(companyCode)),
    (snapshot) => onData(snapshot.exists() ? flattenRun(snapshot.val()) : []),
    (error) => onError?.(error)
  );

/*
| Ek task ki history. Alag listener isliye chahiye ki activity ab task ke
| andar nahi rehti — wo records mein hai, aur list use utaarti hi nahi.
|
| Ye tabhi chalta hai jab koi Activity modal kholta hai, aur band karte hi
| ruk jaata hai. Realtime hone ki wajah se modal khula rehte hue koi status
| badle to nayi line apne aap upar aa jaati hai — bilkul wahi behaviour jo
| pehle tha, jab entries task ke saath aati thin.
|
| Object waisa ka waisa jaata hai (employeeId → timestamp → entry); use
| flat list banana taskUtils ke taskActivityList() ka kaam hai.
*/
export const subscribeTaskActivity = (companyCode, taskId, onData, onError) =>
  onValue(
    ref(db, taskActivityPath(companyCode, taskId)),
    (snapshot) => onData(snapshot.exists() ? snapshot.val() : {}),
    (error) => onError?.(error)
  );

// Edit se sirf ye field badal sakte hain. Baaki sab — id, status, createdBy,
// createdById, createdAt, updatedAt — service ke haath mein hai, chahe payload
// mein aa hi jayein.
const EDITABLE_FIELDS = [
  "title",
  "description",
  "assignedTo",
  "dueDate",
  "priority",
];

/*
|--------------------------------------------------------------------------
| Due / Overdue Nishaan
|--------------------------------------------------------------------------
| "Ye khabar ja chuki hai" — task ke saath hi likha jaata hai.
|
| Due date aane par khud koi likhta nahi: waqt guzarta hai, aur koi na koi
| app kholta hai. Isliye ye khabar wahi list banati hai jo pehle se khuli
| padi hai. Par app din mein das baar khulta hai, aur har baar wahi khabar
| dobara bhejna bell ko bekaar kar dega — isliye nishaan.
|
| Nishaan run ke andar hai, records mein nahi, aur wajah seedhi hai:
| subscribeTasks poora run node pehle se utaar raha hai, to nishaan bina
| kisi nayi read ke saath aa jaata hai. records mein rakhte to har task ke
| liye ek alag get() lagti — jitne tasks, utni read, har baar.
|
| EDITABLE_FIELDS mein ye do naam hain hi nahi, isliye koi edit inhe mita
| nahi sakta, chahe payload mein aa hi jayein. deleteTask run/{taskId}
| poora uda deta hai, to nishaan bhi task ke saath hi chala jaata hai.
|
| DUE_TODAY mein taareekh rakhi jaati hai (kis din bheji thi), OVERDUE
| sirf ek baar likha jaata hai — nikal chuki date par roz tokna madad
| nahi, chidh hai.
*/
export const TASK_NOTIFIED_FIELDS = {
  DUE_TODAY: "notifiedDueToday",
  OVERDUE: "notifiedOverdue",
};

/*
| Sirf nishaan — na updatedAt, na koi aur field. updatedAt chhoo dete to
| "Recent tasks" ka kram har subah apne aap badal jaata, bina kisi ke kuch
| kiye.
*/
/*
| Poora task leta hai, sirf id nahi: nishaan usi khaane mein jaana chahiye
| jahan task sach mein padi hai. Id se likhne par ek dated task ka nishaan
| legacy path par gir jaata — task par kabhi pahunchta hi nahi, aur wahi
| khabar har baar dobara jaati.
*/
export const markTaskDueNotified = async (companyCode, task, field, value) => {
  const taskId = task?.id;

  if (!companyCode || !taskId || !field) return;

  await update(
    ref(db, taskPath(companyCode, resolveBucket(task), taskId)),
    { [field]: value }
  );
};

/*
|--------------------------------------------------------------------------
| Activity
|--------------------------------------------------------------------------
| Har status badlaav ka nishaan records mein rehta hai:
|
|   tasks/records/{taskId}/activity/{employeeId}/{timestamp}
|
| Sirf jodi jaati hai, kabhi badli ya hataayi nahi — isliye "kab kya hua"
| par bharosa kiya ja sakta hai. Entry status ke saath usi ek update() mein
| jaati hai, to activity aur status kabhi alag nahi ho sakte.
|
| employeeId wo hai jisne badlaav kiya (action user), jise task assign hai wo
| nahi — entry ka matlab hi "kisne kiya" hai, aur HR/Owner bhi kisi ka task
| badal sakta hai. Isse ek hi employee ki poori timeline ek jagah rehti hai.
|
| Key hi timestamp hai — entry ke andar wo dobara nahi rakhi jaati. Do jagah
| ek hi baat rakhne ka matlab hota hai ki wo aapas mein alag ho sakti hain;
| padhte waqt taskActivityList() key se timestamp bana leta hai.
|
| Ek hi employee ke do badlaav ek hi millisecond mein tabhi ho sakte hain
| jab do alag task ho (auto-pause), aur unka path alag hota hai — isliye
| koi entry doosri ko overwrite nahi karti.
|
| Dikhne wala text store nahi hota (sirf status), taaki kal wording badle
| to purani entries bhi nayi bhasha bolein — wo kaam taskUtils ke
| activityLabel() ka hai. Apwaad: auto-pause, jiske message mein us doosre
| task ka naam hota hai jo shuru kiya gaya — wo baat kisi field mein nahi.
*/

/*
| Har entry kis baat ki hai, ye wo khud batati hai. Pehle ye kisi field ke
| hone-na-hone se pata chalta tha (khaali fromStatus matlab created,
| assignedToId matlab assignment) — chalta tha, par padhne wale ko har baar
| ye niyam yaad rakhne padte the aur naya event jodna uljhan bhara tha.
|
| Ye value Firebase mein likhi jaati hai, isliye kabhi badalni nahi hai —
| purani entries usi purane naam se padi rehengi.
|
| Purani entries mein type hai hi nahi. taskUtils unhe purane tareeke se
| hi pehchaanta hai, isliye kisi migration ki zaroorat nahi padi.
*/
export const ACTIVITY_TYPE = {
  STATUS_CHANGED: "status_changed",
  AUTO_PAUSED: "auto_paused",
};

/*
| Action user ki key: HR/Employee ke liye unki employeeId ("EMP001"), Owner
| ke liye fixed "owner" — dono getCurrentActionUser() se banke aate hain.
|
| Khaali id par likhte nahi, throw karte hain. Pehle yahan "unknown" ka
| fallback tha, aur jiski bhi id nahi milti uski activity usi ek dabbe mein
| chali jaati thi — history ka matlab hi wahin khatam. Ab galti chhupti
| nahi: dono call site try/catch mein hain aur user ko toast dikh jaata hai.
*/
const actionUserKeyOf = (value) => {
  const key = String(value || "").trim();

  if (!key) {
    throw new Error("Cannot record task activity without a signed-in user.");
  }

  // Firebase key mein . # $ [ ] / nahi chal sakte. employeeId aur "owner"
  // dono surakshit hain, par ye guard yahan sasta hai
  return key.replace(/[.#$[\]/]/g, "_");
};



/*
|--------------------------------------------------------------------------
| Khaana Badalna — ab hota hi nahi
|--------------------------------------------------------------------------
| Yahan pehle moveTask() thi: dueDate badalne par task ka path badal jaata
| tha, to edit ek move ban jaata — purani jagah se hatna aur nayi jagah par
| poora record baithna, dono ek hi update() mein taaki task kabhi do jagah
| ya kahin nahi ho.
|
| Khaana ab assign hone ke din ka hai (taskBucket), aur wo din ateet mein
| hai — koi edit use badal nahi sakta. Task jahan likha gaya wahin poori umar
| rehta hai, isliye move ka poora raasta hata diya gaya: na wo code, na uske
| do khatre (do jagah hona, ya beech mein kahin na hona), na ek edit par
| poora record dobara padhne ki zaroorat.
*/

/*
| createdBy (naam) aur createdById (ownership) dono payload se aate hain —
| service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
| holidayService bhi use karta hai.
|
| id record ke andar store nahi hoti — wo Firebase ki key hi hai, aur
| flattenRun padhte waqt usi key se laga deta hai.
|
| records mein yahan kuch nahi jaata. Activity sirf status ka hisaab hai —
| task ka banna aur kisi ko milna kaam nahi hai, aur wo dono baatein run ke
| createdBy/createdAt/assignedTo mein pehle se poori tarah likhi hain.
| History pehle status change par shuru hoti hai.
*/
export const createTask = async (companyCode, task) => {
  if (!task.createdById) {
    throw new Error("Cannot create a task without a signed-in user.");
  }

  const result = await createTaskApi(stripReadFields(task));

  if (!result || result.success === false) {
    throw new Error(result?.message || "Unable to create the task.");
  }

  const created = result.task;

  try {
    await notifyTaskAssigned(companyCode, created, {
      id: created.createdById,
      name: created.createdBy,
    });
  } catch (notificationError) {
    console.error("Task assignment notification failed:", notificationError);
  }

  return created;
};

/*
| Task edit. status yahan nahi aata — uska apna function hai (updateTaskStatus).
|
| Payload spread nahi karte: sirf EDITABLE_FIELDS chhaante hain, taaki koi
| audit field (createdBy/createdById/createdAt) galti se overwrite na ho.
| undefined field skip hoti hai, warna Firebase usko delete maan leta hai.
|
| Edit history mein nahi jaata — assignee badalna bhi nahi. Activity sirf
| status ka hisaab hai: kaam kab shuru hua, kab ruka, kab pura hua. Kiske
| paas hai, wo run/{taskId}/assignedTo hamesha taaza batata hai.
*/
/*
| previousTask aur actionUser dono optional hain — sirf khabar bhejne ke
| liye. updates mein sirf nayi value hoti hai, isliye "assignee badla ya
| nahi" ka jawab yahan se nikal nahi sakta: purani copy page ke paas hi
| hai (editingTask), wahi se aati hai. Kisne badla, wo bhi service padh
| nahi sakti.
|
| Dono na aayein to edit pehle jaisa hi chalta hai, bas chup-chaap — isliye
| purane call site kabhi tootenge nahi.
*/
export const updateTask = async (
  companyCode,
  taskId,
  task,
  previousTask,
  actionUser
) => {
  const payload = {};

  EDITABLE_FIELDS.forEach((field) => {
    if (task?.[field] !== undefined) {
      payload[field] = task[field];
    }
  });

  const result = await updateTaskApi(taskId, payload);

  if (!result || result.success === false) {
    throw new Error(result?.message || "Unable to update the task.");
  }

  if (!previousTask) return;

  const updatedTask = { ...result.task, id: taskId };

  const reassigned =
    payload.assignedTo !== undefined &&
    previousTask.assignedTo !== updatedTask.assignedTo;

  try {
    if (reassigned) {
      await notifyTaskReassigned(
        companyCode,
        updatedTask,
        previousTask.assignedTo,
        actionUser
      );
    } else {
      await notifyTaskUpdated(companyCode, updatedTask, previousTask, actionUser);
    }
  } catch (notificationError) {
    console.error("Task update notification failed:", notificationError);
  }
};

/*
| Status change.
|
| Poora task leta hai, sirf id nahi — purana status aur title yahin se
| milte hain: ek activity entry ke liye "kahan se kahan" chahiye, aur
| auto-pause ke message mein us task ka naam chahiye jo shuru hua.
|
| pauseTasks wo tasks hain jinhe isi ke saath Paused karna hai — ek employee
| ke paas ek waqt par ek hi task In Progress reh sakta hai, isliye naya start
| karte hi purana ruk jaata hai. Kaun se hain, ye page tay karta hai (uske
| paas poori list hai); service sirf likhti hai.
|
| Sab kuch ek hi update() mein jaata hai — tasks node par multi-path write.
| Isse beech mein do task ek saath In Progress dikhne ka moka nahi milta,
| aur activity kabhi status se alag nahi ho sakti: ya sab likha jaata hai,
| ya kuch nahi.
|
| Status pehle jaisa hi ho to kuch nahi likhta aur false laut jaata hai —
| bekaar write aur jhooti entry, dono se bachne ke liye. Page isi se tay
| karta hai ki toast dikhana hai ya nahi.
|
| Kaun badal sakta hai, ye service tay nahi karti — Owner, HR aur Employee,
| teenon. Employee ko waise bhi apne hi tasks dikhte hain (list tasks.viewAll
| par chhanti hai), isliye "apna hi status" wala niyam wahin se aa jaata hai.
| Entry mein action user jaata hi hai, to kisne badla wo history mein rehta hai.
*/
export const updateTaskStatus = async (
  companyCode,
  task,
  status,
  { actionUser, pauseTasks = [] } = {}
) => {
  const taskId = task?.id;

  if (!taskId) return false;

  const fromStatus = task.status || DEFAULT_TASKS_STATUS;

  if (fromStatus === status) return false;

  // Bina pehchaan likhte nahi — wahi purana guard, wahi message
  actionUserKeyOf(actionUser?.id);

  // pauseTasks page abhi bhi bhejta hai, par auto-pause backend khud
  // nikalta hai (usi niyam se) — isliye yaha use nahi hota. Signature
  // same rakhi hai taaki AllTasks me kuch badalna na pade.
  void pauseTasks;

  const result = await updateTaskStatusApi(taskId, status);

  if (!result || result.success === false) {
    throw new Error(result?.message || "Unable to update task status.");
  }

  if (result.changed === false) return false;

  if (status === COMPLETED_STATUS) {
    try {
      await notifyTaskStatusChanged(companyCode, task, status, actionUser);
    } catch (notificationError) {
      console.error("Task status notification failed:", notificationError);
    }
  }

  return true;
};

/*
| Task ke saath uski history bhi jaati hai — dono ek hi update() mein null,
| taaki records mein kisi mit chuke task ki activity anaath na pade rahe.
*/
/*
| Poora task de do to seedha uske khaane se hat jaata hai. Sirf id dene ki
| purani shakal bhi chalti hai — us soorat mein khaana ek read se dhoondha
| jaata hai, kyunki id akeli ye nahi batati ki task kahan padi hai.
*/
export const deleteTask = async (companyCode, task) => {
  const taskId = typeof task === "string" ? task : task?.id;

  if (!taskId) return;

  const result = await deleteTaskApi(taskId);

  if (!result || result.success === false) {
    throw new Error(result?.message || "Unable to delete the task.");
  }
};