import {db} from "../firebase/firebase";
import {ref, onValue, push, set, update, get} from "firebase/database";
import {getDateKey, getMonthPath} from "../utils/attendance/attendanceDate";
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
| Khaana us din ka hai jis din task diya gaya — us din ka nahi jis din wo
| khatam hona hai.
|
| Pehle ye dueDate se banta tha, aur wo do wajah se badla gaya:
|
|   1. Structure ka matlab. "run/2026/August/2026-08-25" padhne par ab wo
|      seedha kehta hai "25 August ko ye kaam diya gaya" — ek aisi baat jo
|      badalti hi nahi. dueDate wala khaana "25 ko due" kehta tha, aur wo
|      har edit ke saath badal sakta tha.
|
|   2. Task ab kabhi hilta nahi. Assign hone ka din ateet hai — use koi
|      edit nahi badal sakta, isliye task jahan likha gaya wahin poori umar
|      rehta hai. Pehle due date badalna ek move ban jaata tha: purani
|      jagah se hatao, nayi par poora record baithao. Wo poora raasta —
|      aur uske saath do jagah ya kahin nahi hone ka khatra — ab hai hi
|      nahi.
|
| Din ki key sidhe caller se aati hai, timestamp se nahi: createTask ke paas
| pehle se ek `now` hai jo createdAt mein bhi jaata hai, aur dono ek hi
| lamhe se banein — warna aadhi raat par task ek din ke khaane mein aur
| doosre din ke createdAt ke saath baith sakta hai.
|
| Month node attendance ke getMonthPath() se banta hai — wahi helper jo
| attendance, holiday aur leave teenon use karte hain, taaki "August" ek hi
| jagah tay ho. Wo galat date par khaali string deta hai, aur wahi is jagah
| ka pehredaar hai: bina date, aadhi date ya bakwaas date — sab undated
| mein jaate hain, `run/undefined/undefined/...` kabhi nahi banta.
|
| Date khud parse nahi ki jaati (new Date se to bilkul nahi): key pehle se
| local calendar din hai, aur usme se saal-mahina nikalna hi ek tarika hai
| jisme timezone ghus hi nahi sakta.
*/
const taskBucket = (dateKey) => {
  const monthPath = getMonthPath(dateKey);

  return monthPath ? `${monthPath}/${dateKey}` : UNDATED_NODE;
};

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
| Sirf id se task ka khaana dhoondho.
|
| Ye tabhi chalta hai jab caller ne poora task nahi, sirf id di ho —
| deleteTask ki purani shakal. Ek read lagti hai, par delete user khud
| confirm karke karta hai, isliye ek round trip yahan mehnga nahi.
|
| Na mile to null — khaali string nahi. Dono mein farak hai: khaali string
| ek asli jagah hai (legacy), aur null ka matlab hai "aisi koi task hai hi
| nahi". Pehle dono ek hi jawab dete the, aur us soorat mein likhne wala
| ek na-maujood task ke naam par legacy path par kuch bhi likh sakta tha.
| Ab har caller khud tay karta hai: delete ke liye legacy maan lena
| bekhatar hai (null likhna waise bhi kuch nahi karta), likhne ke liye
| nahi.
*/
const lookupBucket = async (companyCode, taskId) => {
  const snapshot = await get(ref(db, runPath(companyCode)));

  if (!snapshot.exists()) return null;

  const found = flattenRun(snapshot.val()).find(
    (task) => task.id === taskId
  );

  return found ? found[BUCKET_FIELD] : null;
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
| actionUser { id, name } page se aata hai — service currentUser padh nahi
| sakti, bilkul waise hi jaise createdBy/createdById ke saath hota hai.
|
| Uski id entry mein nahi jaati: wo path mein hi hai. Waise hi timestamp
| bhi nahi — wo key hai. actionBy rehta hai kyunki timeline har line par
| naam dikhati hai, aur Owner employees list mein hota hi nahi — id se
| uska naam kabhi nikalta nahi.
|
| Khaali string isliye ki Firebase undefined leta hi nahi.
*/
const activityEntry = (type, from, to, actionUser, extra = {}) => ({
  type,
  fromStatus: from,
  toStatus: to,
  actionBy: actionUser?.name || "",
  ...extra,
});

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
  /*
  | Key pehle ki tarah run ke root se banti hai — push sirf ek unique naam
  | deta hai, jagah nahi. Task uske baad apne khaane mein likha jaata hai.
  */
  const taskId = push(ref(db, runPath(companyCode))).key;

  /*
  | Bina pehchaan ke task banta hi nahi — ownership isi par tiki hai
  | (isTaskCreator). Khaali chhod dene par har us task ka maalik ek jaisa
  | ho jaata jiska koi maalik nahi.
  */
  if (!task.createdById) {
    throw new Error("Cannot create a task without a signed-in user.");
  }

  const now = Date.now();

  const newTask = {
    ...stripReadFields(task),
    status: DEFAULT_TASKS_STATUS,
    createdAt: now,
    updatedAt: now,
  };

  /*
  | Naya task us din ke khaane mein jis din wo diya ja raha hai — yaani aaj.
  | Khaana record mein nahi jaata: wo path hi hai.
  |
  | Din usi `now` se banta hai jo createdAt mein gaya, alag se Date.now()
  | dobara nahi poochha jaata: aadhi raat ke aas-paas do call do alag din de
  | sakti hain, aur tab task ek din ke khaane mein baithta par createdAt
  | doosre din ka hota.
  |
  | Undated yahan practically nahi banta — aaj ki key hamesha theek hoti hai
  | — par taskBucket ka wo pehredaar hataya nahi gaya, kyunki undated node
  | purane tasks ke liye ab bhi ek asli jagah hai.
  */
  const bucket = taskBucket(getDateKey(now));

  await set(ref(db, taskPath(companyCode, bucket, taskId)), newTask);

  // Khaana lautaye hue task par bhi, taaki jo ise aage badhaye wo bina
  // dhoondhe likh sake — bilkul waise jaise flattenRun deta hai
  const created = {id:taskId, ...newTask, [BUCKET_FIELD]: bucket};

  /*
  | Task pehle banta hai, khabar baad mein — aur khabar na ja paaye to bhi
  | task bana hua hi rehta hai. Wahi tarika leaveService bhi apnata hai:
  | notification ki galti user ke kaam ko kabhi nahi rokti, sirf console
  | tak jaati hai.
  |
  | Action user alag se nahi maangte — wo record mein pehle se hai.
  | createdById/createdBy wahi jodi hai jo getCurrentActionUser() deta hai,
  | isliye "apne hi liye banaya task" wala case service ke guard mein khud
  | pakda jaata hai: recipient aur actor dono ek hi id.
  */
  try {
    await notifyTaskAssigned(companyCode, created, {
      id: newTask.createdById,
      name: newTask.createdBy,
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
  const updates = { updatedAt: Date.now() };

  EDITABLE_FIELDS.forEach((field) => {
    if (task?.[field] !== undefined) {
      updates[field] = task[field];
    }
  });

  /*
  | Task abhi kahan padi hai.
  |
  | Purani copy ho to seedha BUCKET_FIELD se — flattenRun ne chipkaya hua.
  | Na ho to Firebase se dhoondhna padta hai. Pehle us soorat mein legacy
  | maan liya jaata tha, aur ek dated task par aisa update run/{taskId} par
  | ek aadha-adhoora node chhod deta: asli task jyon ka tyon, aur uske naam
  | par ek nakli node jisme sirf abhi bheji gayi fields hotin.
  |
  | Na mile to likhte nahi — saaf mana kar dete hain, wahi baat jo moveTask
  | bhi kehta hai jab purani jagah khaali mile. resolveBucket kabhi null
  | nahi deta, isliye ye check sirf lookup wale raaste par lagta hai.
  */
  const oldBucket = previousTask
    ? resolveBucket(previousTask)
    : await lookupBucket(companyCode, taskId);

  if (oldBucket === null) {
    throw new Error("This task no longer exists.");
  }

  /*
  | Seedha partial update, apni hi jagah par — edit se khaana kabhi badalta
  | nahi.
  |
  | Khaana ab assign hone ke din ka hai (taskBucket), aur wo din ateet mein
  | hai: koi edit use badal nahi sakta. Isliye task jahan likha gaya wahin
  | rehta hai, aur "kya due date badli" poochhne ki zaroorat hi nahi bachti.
  |
  | Pehle ye branch hoti thi. dueDate badalne par task ka path badal jaata
  | tha, to edit ek move ban jaata: purani jagah se hatao aur nayi jagah par
  | poora record baithao, dono ek hi update() mein taaki task kabhi do jagah
  | ya kahin nahi ho. Wo poora khatra ab maujood hi nahi hai — na hi wo
  | code, jo isi ke saath hataya gaya.
  */
  await update(
    ref(db, taskPath(companyCode, oldBucket, taskId)),
    updates
  );

  /*
  | Bina purani copy ke kuch compare nahi ho sakta — na "assignee badla",
  | na "kya badla". Us soorat mein edit chup-chaap ho jaata hai.
  */
  if (!previousTask) return;

  /*
  | Purani copy par nayi values chadha kar poora task banta hai — service
  | ko title, due date aur assignee ek saath chahiye, aur id bhi, jo
  | updates mein kabhi nahi hoti.
  */
  const updatedTask = { ...previousTask, ...updates, id: taskId };

  /*
  | Field tabhi hoti hai jab payload mein aayi ho, isliye pehle uska hona
  | dekhte hain: bina assignedTo wala edit purani value se takra kar jhooti
  | "reassign" na bana de.
  */
  const reassigned =
    updates.assignedTo !== undefined &&
    previousTask.assignedTo !== updates.assignedTo;

  try {
    /*
    | Ek edit, ek khabar. Assignee badla to reassign hi jaata hai — us
    | khabar mein title aur due date pehle se hain, to uske upar "Task
    | Updated" bhejna wahi baat do baar kehna hoga.
    |
    | Warna kya-kya badla ye service khud tay karti hai (title, dueDate,
    | priority). Sirf description badli ho to wo kuch likhti hi nahi.
    */
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

  const now = Date.now();
  // Kaam karne wale ki key — status likhne se pehle, taaki bina pehchaan
  // wala change run mein bhi na jaye aur records mein bhi na
  const actionUserKey = actionUserKeyOf(actionUser?.id);
  const updates = {};

  /*
  | Ek task ka live status + uski entry — dono ek saath, taaki koi jagah
  | chhoote nahi. Keys tasks node ke sapeksh hain: run/... live data hai,
  | records/... history.
  |
  | Ek hi write ki saari entries ka waqt bhi ek hi rehta hai (now), aur wahi
  | key bhi banta hai. Do task ek hi millisecond par bhi takraate nahi —
  | taskId path mein alag hai.
  */
  const addChange = (item, type, from, to, extra = {}) => {
    /*
    | Har task apne khaane mein. Auto-pause wale doosri taareekh par ho
    | sakte hain, isliye path har ek ka apna banta hai — ek hi run/{id}
    | maan lena unme se kisi ko bhi chhoot deta.
    */
    const rel = taskRelPath(resolveBucket(item), item.id);

    updates[`${rel}/status`] = to;
    updates[`${rel}/updatedAt`] = now;
    updates[`records/${item.id}/activity/${actionUserKey}/${now}`] = activityEntry(
      type,
      from,
      to,
      actionUser,
      extra
    );
  };

  addChange(task, ACTIVITY_TYPE.STATUS_CHANGED, fromStatus, status);

  pauseTasks.forEach((item) => {
    // Wahi task dobara pause na ho jaye jise abhi start kar rahe hain
    if (!item?.id || item.id === taskId) return;

    /*
    | auto_paused apna alag type hai, aur auto: true bhi rehta hai — purani
    | entries usi flag se pehchani jaati hain, isliye wo hataya nahi. Action
    | user phir bhi wahi hai jisne doosra task start kiya — zimmedari usi ki hai.
    */
    addChange(
      item,
      ACTIVITY_TYPE.AUTO_PAUSED,
      item.status || IN_PROGRESS_STATUS,
      PAUSED_STATUS,
      {
        auto: true,
        message: `Paused automatically when "${
          task.title || "another task"
        }" was started`,
      }
    );
  });

  await update(ref(db, tasksPath(companyCode)), updates);

  /*
  | Khabar sirf poora hone par. Task jitni baar shuru-ruka hota hai, utni
  | baar creator ko batana matlab bell ko shor bana dena — aur jo shor hai
  | use koi padhta nahi. Kaam kahan tak pahuncha, wo /tasks par hamesha
  | dikhta hi hai; khatam hona wahi ek mod hai jiska intezaar hota hai.
  |
  | Sirf wahi task jise user ne badla. pauseTasks isme nahi aate: unka
  | status kisi ne chuna nahi, wo "ek waqt par ek kaam" ke niyam ka side
  | effect hain — aur wo tasks usi employee ke apne hote hain.
  |
  | Yahan tak pahunche hain, matlab status sach mein badla hai: upar
  | fromStatus === status wala check pehle hi false lauta chuka hota.
  */
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

  /*
  | Na mili to legacy — delete ke liye ye bekhatar hai: jo path hai hi
  | nahi use null karne se kuch nahi hota, aur records/{taskId} phir bhi
  | saaf ho jaata hai.
  */
  const bucket =
    typeof task === "string"
      ? (await lookupBucket(companyCode, taskId)) ?? LEGACY_BUCKET
      : resolveBucket(task);

  await update(ref(db, tasksPath(companyCode)), {
    [taskRelPath(bucket, taskId)]: null,
    [`records/${taskId}`]: null,
  });
};