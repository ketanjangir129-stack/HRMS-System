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
| createdBy (naam) aur createdById (ownership) dono payload se aate hain —
| service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
| holidayService bhi use karta hai.
|
| id record ke andar store nahi hoti — wo Firebase ki key hi hai, aur
| toTaskList padhte waqt usi key se laga deta hai.
*/
export const createTask = async (companyCode, task) => {
  const taskId = push(ref(db, tasksPath(companyCode))).key;
  const newTask = {
    ...task,
    status: DEFAULT_TASKS_STATUS,
    createdBy: task.createdBy || "",
    createdById: task.createdById || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
| pauseTaskIds un tasks ki id hai jinhe isi ke saath Paused karna hai — ek
| employee ke paas ek waqt par ek hi task In Progress reh sakta hai, isliye
| naya start karte hi purana ruk jaata hai. Kaun se task hain, ye page tay
| karta hai (uske paas poori list hai); service sirf likhti hai.
|
| Dono badlaav ek hi update() mein jaate hain — tasks node par multi-path
| write. Isse beech mein do task ek saath In Progress dikhne ka moka nahi
| milta: ya dono badalte hain, ya koi nahi.
*/
export const updateTaskStatus = async (
  companyCode,
  taskId,
  status,
  pauseTaskIds = []
) => {
  const now = Date.now();

  const updates = {
    [`${taskId}/status`]: status,
    [`${taskId}/updatedAt`]: now,
  };

  pauseTaskIds.forEach((id) => {
    // Wahi task dobara pause na ho jaye jise abhi start kar rahe hain
    if (id === taskId) return;

    updates[`${id}/status`] = PAUSED_STATUS;
    updates[`${id}/updatedAt`] = now;
  });

  await update(ref(db, tasksPath(companyCode)), updates);
};

export const deleteTask = async (companyCode, taskId) => {
  await remove(ref(db, taskPath(companyCode, taskId)));
};