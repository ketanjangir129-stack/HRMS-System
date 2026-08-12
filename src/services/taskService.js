import {db} from "../firebase/firebase";
import {ref, onValue, push, update} from "firebase/database";
import { OWNER_ROLE } from "../utils/permissions/permissionConstants";

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
*/
const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const runPath = (companyCode) => `${tasksPath(companyCode)}/run`;
const taskActivityPath = (companyCode, taskId) =>
  `${tasksPath(companyCode)}/records/${taskId}/activity`;

/*
| Firebase object deta hai, page ko array chahiye.
| { "-Nx8": {...} }  →  [ { id: "-Nx8", ... } ]
|
| id spread ke BAAD hai, isliye Firebase ki key hamesha jeetti hai. Purane
| records mein id andar bhi padi hai (pehle store hoti thi) — agar wo kabhi
| key se alag ho jaye to key hi sahi maani jaayegi.
*/
const toTaskList = (data) =>
  Object.entries(data || {})
    .map(([id, task]) => ({ ...task, id }))
    // New task sbse upar -createdAt jitna bada , utna new
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

// Realtime listener — jab bhi tasks badlein, onData dobara chalta hai.
// Doosre user ka banaya task bhi bina refresh dikh jaayega.
//
// Return hone wala function listener band karta hai — use useEffect ke
// cleanup mein zaroor chalana, warna page chhodne ke baad bhi listener
// chalta rehta hai (memory leak).
export const subscribeTasks = (companyCode, onData, onError) =>
  onValue(
    ref(db, runPath(companyCode)),
    (snapshot) => onData(snapshot.exists() ? toTaskList(snapshot.val()) : []),
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
| employeeId wo hai jisne badlaav kiya (actor), jise task assign hai wo
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
  CREATED: "created",
  ASSIGNED: "assigned",
  STATUS_CHANGED: "status_changed",
  AUTO_PAUSED: "auto_paused",
};

/*
| Actor ki key: HR/Employee ke liye unki employeeId ("EMP001"), Owner ke
| liye fixed "owner" — dono getCurrentActor() se banke aate hain.
|
| Khaali id par likhte nahi, throw karte hain. Pehle yahan "unknown" ka
| fallback tha, aur jiski bhi id nahi milti uski activity usi ek dabbe mein
| chali jaati thi — history ka matlab hi wahin khatam. Ab galti chhupti
| nahi: dono call site try/catch mein hain aur user ko toast dikh jaata hai.
*/
const actorKeyOf = (value) => {
  const key = String(value || "").trim();

  if (!key) {
    throw new Error("Cannot record task activity without a signed-in user.");
  }

  // Firebase key mein . # $ [ ] / nahi chal sakte. employeeId aur "owner"
  // dono surakshit hain, par ye guard yahan sasta hai
  return key.replace(/[.#$[\]/]/g, "_");
};

/*
| actor { id, name } page se aata hai — service currentUser padh nahi
| sakti, bilkul waise hi jaise createdBy/createdById ke saath hota hai.
|
| actorId entry mein nahi jaata: wo path mein hi hai. Waise hi timestamp
| bhi nahi — wo key hai. actorName rehta hai kyunki timeline har line par
| naam dikhati hai, aur Owner employees list mein hota hi nahi — id se
| uska naam kabhi nikalta nahi.
|
| Khaali string isliye ki Firebase undefined leta hi nahi.
*/
const activityEntry = (type, from, to, actor, extra = {}) => ({
  type,
  fromStatus: from,
  toStatus: to,
  actorName: actor?.name || "",
  ...extra,
});

/*
| Task ban gaya — bas itni baat. Status yahan nahi rakhte: "kahan se kahan"
| tabhi maayne rakhta hai jab kuch badla ho, aur banne se pehle to kuch tha
| hi nahi. Pehli asli status entry apne aap se hi puri kahani keh deti hai.
*/
const createdEntry = (actor) => ({
  type: ACTIVITY_TYPE.CREATED,
  actorName: actor?.name || "",
});

/*
| Assignment/reassignment ki entry. Isme fromStatus/toStatus hote hi nahi —
| kisi ko dena status badalna nahi hai, aur khaali status likhne se timeline
| ka dot jhoothi baat kehne lagta.
|
| Yahi do field is entry ki pehchaan bhi hain: assignedToId ho to entry
| assignment ki hai. Isliye alag "type" field nahi chahiye — bilkul waise
| hi jaise khaali fromStatus "Task created" ka nishaan hai.
|
| Naam bhi saath rakhte hain, sirf id nahi: Employee ke paas employees list
| hoti hi nahi (wo load hi nahi hoti), aur employee record kal delete ho
| jaye to purani entry bina naam ke reh jaati. Text phir bhi store nahi
| hota — wo activityLabel() runtime par banata hai.
*/
const assignmentEntry = (actor, assignee) => ({
  type: ACTIVITY_TYPE.ASSIGNED,
  actorName: actor?.name || "",
  assignedToId: assignee?.id || "",
  assignedToName: assignee?.name || assignee?.id || "",
});

/*
| createdBy (naam) aur createdById (ownership) dono payload se aate hain —
| service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
| holidayService bhi use karta hai.
|
| id record ke andar store nahi hoti — wo Firebase ki key hi hai, aur
| toTaskList padhte waqt usi key se laga deta hai.
*/
export const createTask = async (companyCode, task, { assignedToName } = {}) => {
  const taskId = push(ref(db, runPath(companyCode))).key;

  /*
  | Actor wahi hai jo createdBy/createdById mein ja raha hai; iske liye
  | koi nayi pehchaan nahi maangi jaati.
  */
  const creator = {
    id: task.createdById || "",
    name: task.createdBy || "",
  };

  /*
  | Bina pehchaan ke task banta hi nahi. createdById par ownership tiki hai
  | (isTaskCreator) aur wahi activity ki key bhi banti hai — khaali chhod
  | dene par dono jhoothe ho jaate hain. Key banane se pehle rok dete hain,
  | taaki adhoora task run mein pahunche hi nahi.
  */
  const creatorKey = actorKeyOf(creator.id);

  const now = Date.now();

  const newTask = {
    ...task,
    status: DEFAULT_TASKS_STATUS,
    createdBy: creator.name,
    createdById: creator.id,
    createdAt: now,
    updatedAt: now,
  };

  /*
  | Task aur uski pehli entry ek hi update() mein — dono alag node par hain,
  | par write ek hi hai, warna task ban jaata aur uski pehli entry na banti.
  |
  | Entry apna type khud batati hai — "created". Iske pehle ye baat khaali
  | fromStatus se samjhi jaati thi.
  */
  const updates = {
    [`run/${taskId}`]: newTask,
    [`records/${taskId}/activity/${creatorKey}/${now}`]: createdEntry(creator),
  };

  /*
  | Banana aur kisi ko dena do alag baatein hain, isliye do entry — timeline
  | par "Task created" ke upar "Task assigned to X" dikhta hai.
  |
  | now + 1 isliye ki key actorId + timestamp hai: dono ek hi millisecond par
  | likhte to doosri pehli ko chup-chaap kha jaati. Ek millisecond aage rakhne
  | se kram bhi wahi rehta hai jo hua tha.
  */
  if (newTask.assignedTo) {
    updates[`records/${taskId}/activity/${creatorKey}/${now + 1}`] =
      assignmentEntry(creator, {
        id: newTask.assignedTo,
        name: assignedToName,
      });
  }

  await update(ref(db, tasksPath(companyCode)), updates);

  return {id:taskId, ...newTask};
};

/*
| Task edit. status yahan nahi aata — uska apna function hai (updateTaskStatus).
|
| Payload spread nahi karte: sirf EDITABLE_FIELDS chhaante hain, taaki koi
| audit field (createdBy/createdById/createdAt) galti se overwrite na ho.
| undefined field skip hoti hai, warna Firebase usko delete maan leta hai.
|
| Title/priority/due date badalna history mein nahi jaata — wo roz ka
| sudhaar hai. Assignee badalna jaata hai: kaam kisi aur ke sar par chala
| gaya, aur baad mein "ye mere paas kaise aaya" ka jawab yahi entry deti hai.
|
| Isliye ab write tasks node par hai, sirf run/{taskId} par nahi: badla hua
| assignee aur uski entry ek hi update() mein jaate hain — wahi tehen jo
| createTask aur updateTaskStatus ki hai.
|
| previous purana task hai (page ke paas pehle se hai). Uske bina "badla ya
| nahi" ka pata nahi chalta, aur har edit par entry ban jaati.
*/
export const updateTask = async (
  companyCode,
  taskId,
  task,
  { actor, previous, assignedToName } = {}
) => {
  const now = Date.now();

  // Keys tasks node ke sapeksh — run/... live data, records/... history
  const updates = { [`run/${taskId}/updatedAt`]: now };

  EDITABLE_FIELDS.forEach((field) => {
    if (task?.[field] !== undefined) {
      updates[`run/${taskId}/${field}`] = task[field];
    }
  });

  /*
  | Entry tabhi jab assignee sach mein badla ho. Wahi naam dobara save karne
  | par history mein jhoothi reassignment nahi dikhni chahiye.
  |
  | actor na ho to entry nahi — purane call site (agar koi bacha ho) waise
  | hi chalte rahein, bas unki edit history mein na dikhe.
  */
  const nextAssignee = task?.assignedTo;

  if (actor && nextAssignee && nextAssignee !== previous?.assignedTo) {
    updates[`records/${taskId}/activity/${actorKeyOf(actor.id)}/${now}`] =
      assignmentEntry(actor, { id: nextAssignee, name: assignedToName });
  }

  await update(ref(db, tasksPath(companyCode)), updates);
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
| Status wahi badal sakta hai jise task mila hai — apna kaam apna status.
| Dekhne, dene ya edit karne se koi kaam nahi hota, isliye HR ka diya hua
| task chalu ya poora wahi Employee karega jiske paas hai.
|
| Owner isi niyam se bahar ho jaata hai (uska employee record hi nahi, to
| koi task uska ho hi nahi sakta), par uske liye alag saaf message rakha
| hai — ye rok Settings ki kisi switch se nahi aa sakti, kyunki har section
| Owner ke liye apne aap true hai.
|
| UI dropdown deta hi nahi jahan haq nahi — ye uske peeche ki doosri deewar
| hai, purane khule tab ya seedhi call ke liye.
|
| Bina assignee wale purane task par ye rok nahi lagti: unka koi maalik hi
| nahi, aur unhe hamesha ke liye jam karna theek nahi.
*/
export const updateTaskStatus = async (
  companyCode,
  task,
  status,
  { actor, pauseTasks = [] } = {}
) => {
  const taskId = task?.id;

  if (!taskId) return false;

  if (actor?.id === OWNER_ROLE) {
    throw new Error("Owner cannot change task status.");
  }

  if (task.assignedTo && actor?.id !== task.assignedTo) {
    throw new Error("Only the assigned employee can change this task status.");
  }

  const fromStatus = task.status || DEFAULT_TASKS_STATUS;

  if (fromStatus === status) return false;

  const now = Date.now();
  // Kaam karne wale ki key — status likhne se pehle, taaki bina pehchaan
  // wala change run mein bhi na jaye aur records mein bhi na
  const actorKey = actorKeyOf(actor?.id);
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
  const addChange = (id, type, from, to, extra = {}) => {
    updates[`run/${id}/status`] = to;
    updates[`run/${id}/updatedAt`] = now;
    updates[`records/${id}/activity/${actorKey}/${now}`] = activityEntry(
      type,
      from,
      to,
      actor,
      extra
    );
  };

  addChange(taskId, ACTIVITY_TYPE.STATUS_CHANGED, fromStatus, status);

  pauseTasks.forEach((item) => {
    // Wahi task dobara pause na ho jaye jise abhi start kar rahe hain
    if (!item?.id || item.id === taskId) return;

    /*
    | auto_paused apna alag type hai, aur auto: true bhi rehta hai — purani
    | entries usi flag se pehchani jaati hain, isliye wo hataya nahi. Actor
    | phir bhi wahi hai jisne doosra task start kiya — zimmedari usi ki hai.
    */
    addChange(
      item.id,
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

  return true;
};

/*
| Task ke saath uski history bhi jaati hai — dono ek hi update() mein null,
| taaki records mein kisi mit chuke task ki activity anaath na pade rahe.
*/
export const deleteTask = async (companyCode, taskId) => {
  await update(ref(db, tasksPath(companyCode)), {
    [`run/${taskId}`]: null,
    [`records/${taskId}`]: null,
  });
};