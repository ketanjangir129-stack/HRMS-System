import {db} from "../firebase/firebase";
import {ref, onValue, push, set, update, remove} from "firebase/database";

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

const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const taskPath = (companyCode, taskId) => `${tasksPath(companyCode)}/${taskId}`;

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
    ref(db, tasksPath(companyCode)),
    (snapshot) => onData(snapshot.exists() ? toTaskList(snapshot.val()) : []),
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
| Har badlaav ka nishaan task ke andar hi rehta hai:
|
|   tasks/{taskId}/activity/{pushKey}
|
| Sirf jodi jaati hai, kabhi badli ya hataayi nahi — isliye "kab kya hua"
| par bharosa kiya ja sakta hai. Entry status ke saath usi ek write mein
| jaati hai, to activity aur status kabhi alag nahi ho sakte.
|
| Dikhne wala text yahan store nahi hota (sirf type aur status), taaki kal
| wording badle to purani entries bhi nayi bhasha bolein — wo kaam
| taskUtils ke activityLabel() ka hai. Apwaad: auto-pause, jiske message
| mein us doosre task ka naam hota hai jo shuru kiya gaya — wo baat kisi
| field mein nahi hai.
*/
export const ACTIVITY_TYPES = {
  CREATED: "created",
  STATUS_CHANGED: "status_changed",
};

/*
| actor { id, name } page se aata hai — service currentUser padh nahi
| sakti, bilkul waise hi jaise createdBy/createdById ke saath hota hai.
|
| Khaali string isliye ki Firebase undefined leta hi nahi.
*/
const activityEntry = (type, actor, extra = {}) => ({
  type,
  actorId: actor?.id || "",
  actorName: actor?.name || "",
  timestamp: Date.now(),
  ...extra,
});

// Key pehle se bana lete hain — push() bina value ke kuch likhta nahi, sirf
// key deta hai. Date.now() isliye nahi ki ek write mein kai entries banti hain.
const newActivityKey = (companyCode, taskId) =>
  push(ref(db, `${taskPath(companyCode, taskId)}/activity`)).key;

/*
| createdBy (naam) aur createdById (ownership) dono payload se aate hain —
| service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
| holidayService bhi use karta hai.
|
| id record ke andar store nahi hoti — wo Firebase ki key hi hai, aur
| toTaskList padhte waqt usi key se laga deta hai.
*/
export const createTask = async (companyCode, task) => {
  const taskId = push(ref(db, tasksPath(companyCode))).key;

  /*
  | Pehli activity entry usi set() mein chali jaati hai — alag write nahi,
  | warna task ban jaata aur uski pehli entry na banti.
  |
  | Actor wahi hai jo createdBy/createdById mein ja raha hai; iske liye
  | koi nayi pehchaan nahi maangi jaati.
  */
  const creator = {
    id: task.createdById || "",
    name: task.createdBy || "",
  };

  const newTask = {
    ...task,
    status: DEFAULT_TASKS_STATUS,
    createdBy: creator.name,
    createdById: creator.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    activity: {
      [newActivityKey(companyCode, taskId)]: activityEntry(
        ACTIVITY_TYPES.CREATED,
        creator
      ),
    },
  };

  await set(ref(db, taskPath(companyCode, taskId)), newTask);
  return {id:taskId, ...newTask};
};

/*
| Task edit. status yahan nahi aata — uska apna function hai (updateTaskStatus).
|
| Payload spread nahi karte: sirf EDITABLE_FIELDS chhaante hain, taaki koi
| audit field (createdBy/createdById/createdAt) galti se overwrite na ho.
| undefined field skip hoti hai, warna Firebase usko delete maan leta hai.
*/
export const updateTask = async (companyCode, taskId, task) => {
  const updates = { updatedAt: Date.now() };

  EDITABLE_FIELDS.forEach((field) => {
    if (task?.[field] !== undefined) {
      updates[field] = task[field];
    }
  });

  await update(ref(db, taskPath(companyCode, taskId)), updates);
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
*/
export const updateTaskStatus = async (
  companyCode,
  task,
  status,
  { actor, pauseTasks = [] } = {}
) => {
  const taskId = task?.id;

  if (!taskId) return false;

  const fromStatus = task.status || DEFAULT_TASKS_STATUS;

  if (fromStatus === status) return false;

  const now = Date.now();
  const updates = {};

  // Ek task ka status + uski entry — dono ek saath, taaki koi jagah
  // chhoote nahi
  const addChange = (id, from, to, extra = {}) => {
    updates[`${id}/status`] = to;
    updates[`${id}/updatedAt`] = now;
    updates[`${id}/activity/${newActivityKey(companyCode, id)}`] = {
      ...activityEntry(ACTIVITY_TYPES.STATUS_CHANGED, actor, {
        fromStatus: from,
        toStatus: to,
        ...extra,
      }),
      // Ek hi write ki saari entries ka waqt bhi ek hi rehna chahiye
      timestamp: now,
    };
  };

  addChange(taskId, fromStatus, status);

  pauseTasks.forEach((item) => {
    // Wahi task dobara pause na ho jaye jise abhi start kar rahe hain
    if (!item?.id || item.id === taskId) return;

    /*
    | auto: true batata hai ki ye user ka seedha click nahi tha. actor phir
    | bhi wahi hai jisne doosra task start kiya — zimmedari usi ki hai.
    */
    addChange(item.id, item.status || IN_PROGRESS_STATUS, PAUSED_STATUS, {
      auto: true,
      message: `Paused automatically when "${
        task.title || "another task"
      }" was started`,
    });
  });

  await update(ref(db, tasksPath(companyCode)), updates);

  return true;
};

export const deleteTask = async (companyCode, taskId) => {
  await remove(ref(db, taskPath(companyCode, taskId)));
};