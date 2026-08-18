import {db} from "../firebase/firebase";
import {ref, onValue, push, set, update} from "firebase/database";
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
*/
const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const runPath = (companyCode) => `${tasksPath(companyCode)}/run`;
const taskPath = (companyCode, taskId) => `${runPath(companyCode)}/${taskId}`;
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
export const markTaskDueNotified = async (companyCode, taskId, field, value) => {
  if (!companyCode || !taskId || !field) return;

  await update(ref(db, taskPath(companyCode, taskId)), { [field]: value });
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
| createdBy (naam) aur createdById (ownership) dono payload se aate hain —
| service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
| holidayService bhi use karta hai.
|
| id record ke andar store nahi hoti — wo Firebase ki key hi hai, aur
| toTaskList padhte waqt usi key se laga deta hai.
|
| records mein yahan kuch nahi jaata. Activity sirf status ka hisaab hai —
| task ka banna aur kisi ko milna kaam nahi hai, aur wo dono baatein run ke
| createdBy/createdAt/assignedTo mein pehle se poori tarah likhi hain.
| History pehle status change par shuru hoti hai.
*/
export const createTask = async (companyCode, task) => {
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
    ...task,
    status: DEFAULT_TASKS_STATUS,
    createdAt: now,
    updatedAt: now,
  };

  await set(ref(db, taskPath(companyCode, taskId)), newTask);

  const created = {id:taskId, ...newTask};

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

  await update(ref(db, taskPath(companyCode, taskId)), updates);

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
  const addChange = (id, type, from, to, extra = {}) => {
    updates[`run/${id}/status`] = to;
    updates[`run/${id}/updatedAt`] = now;
    updates[`records/${id}/activity/${actionUserKey}/${now}`] = activityEntry(
      type,
      from,
      to,
      actionUser,
      extra
    );
  };

  addChange(taskId, ACTIVITY_TYPE.STATUS_CHANGED, fromStatus, status);

  pauseTasks.forEach((item) => {
    // Wahi task dobara pause na ho jaye jise abhi start kar rahe hain
    if (!item?.id || item.id === taskId) return;

    /*
    | auto_paused apna alag type hai, aur auto: true bhi rehta hai — purani
    | entries usi flag se pehchani jaati hain, isliye wo hataya nahi. Action
    | user phir bhi wahi hai jisne doosra task start kiya — zimmedari usi ki hai.
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
export const deleteTask = async (companyCode, taskId) => {
  await update(ref(db, tasksPath(companyCode)), {
    [`run/${taskId}`]: null,
    [`records/${taskId}`]: null,
  });
};