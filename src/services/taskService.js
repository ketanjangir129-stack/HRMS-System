import {db} from "../firebase/firebase";
import {ref, get, onValue, push, set, update, remove} from "firebase/database";

export const TASK_STATUSES = ["To Do", "In Progress", "Completed"];

// Naya task hamesha pehle status se shuru hota hai
export const DEFAULT_TASKS_STATUS = TASK_STATUSES[0];

// Aakhri status — "pending hai ya nahi" ka check isi se hota hai
export const COMPLETED_STATUS = TASK_STATUSES[TASK_STATUSES.length - 1];

const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const taskPath = (companyCode, taskId) => `${tasksPath(companyCode)}/${taskId}`;

// Firebase object deta hai, page ko array chahiye.
// { "-Nx8": {...} }  →  [ { id: "-Nx8", ... } ]
const toTaskList = (data) =>
  Object.entries(data || {})
    .map(([id, task]) => ({ id, ...task }))
    // New task sbse upar -createdAt jitna bada , utna new
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

export const getTasks = async (companyCode) => {
  const snapshot = await get(ref(db, tasksPath(companyCode)));
  if  (!snapshot.exists()){
    return [];
  }

  return toTaskList(snapshot.val());
};

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

// createdBy (naam) aur createdById (ownership) dono payload se aate hain —
// service currentUser padh nahi sakti (hook yahan chalta nahi). Wahi tarika
// holidayService bhi use karta hai.
export const createTask = async (companyCode, task) => {
  const taskId = push(ref(db, tasksPath(companyCode))).key;
  const newTask = {
    ...task,
    id: taskId,
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

export const updateTaskStatus = async (companyCode, taskId, status) => {
  await update(ref(db, taskPath(companyCode, taskId)), {
    status,
    updatedAt: Date.now(),
  });
};

export const deleteTask = async (companyCode, taskId) => {
  await remove(ref(db, taskPath(companyCode, taskId)));
};