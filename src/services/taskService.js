import {db} from "../firebase/firebase";
import {ref, get, push, set, update, remove} from "firebase/database";

export const TASK_STATUSES = ["To Do", "In Progress", "Completed"];
export const DEFAULT_TASKS_STATUS = TASK_STATUSES[0];

const tasksPath = (companyCode) => `companies/${companyCode}/tasks`;
const taskPath = (companyCode, taskId) => `${tasksPath(companyCode)}/${taskId}`;

export const getTasks = async (companyCode) => {
  const snapshot = await get(ref(db, tasksPath(companyCode)));
  if  (!snapshot.exists()){
    return [];
  }

  const data = snapshot.val();
  return Object.entries(data).map(([id, task]) => ({ id, ...task }))
  // New task sbse upar -createdAt jitna bada , utna new
  .sort((a, b) => b.createdAt - a.createdAt);
};

export const createTask = async (companyCode, task) => {
  const taskId = push(ref(db, tasksPath(companyCode))).key;
  const newTask = {
    ...task,
    id: taskId,
    status: DEFAULT_TASKS_STATUS,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await set(ref(db, taskPath(companyCode, taskId)), newTask);
  return {id:taskId, ...newTask};
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