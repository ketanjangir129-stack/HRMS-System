import { COMPLETED_STATUS } from "../../services/taskService";
import {
  ERROR_INPUT_CLASS,
  INPUT_CLASS,
  MANAGER_ROLES,
} from "./taskConstants";

/*
|--------------------------------------------------------------------------
| Task Utils
|--------------------------------------------------------------------------
| Chhote pure functions — koi state nahi, koi Firebase nahi. Andar jo diya,
| usi se bahar nikalta hai. Isliye kisi bhi page/component se use ho sakte hain.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Roles & Permissions
|--------------------------------------------------------------------------
| Owner Firebase Auth se aata hai aur uska role seedha user object par hota
| hai. HR/Employee custom login use karte hain — unka role `account` mein.
| Yahi pattern attendanceRequestUtils.js mein bhi hai.
|--------------------------------------------------------------------------
*/

export const getUserRole = (currentUser) =>
  currentUser?.account?.role || currentUser?.role || "";

// Owner aur HR tasks assign, edit aur delete kar sakte hain
export const isManager = (currentUser) =>
  MANAGER_ROLES.includes(getUserRole(currentUser));

// Owner ke paas employmentInfo nahi hota — wo employee hai hi nahi
export const getCurrentEmployeeId = (currentUser) =>
  currentUser?.employmentInfo?.employeeId ||
  currentUser?.account?.username ||
  "";

// Sirf logged-in employee ke apne tasks — "My Tasks" wala view.
// Filter browser mein hota hai, isliye Firebase mein index ki zaroorat nahi.
export const filterOwnTasks = (tasks = [], currentUser) => {
  const employeeId = getCurrentEmployeeId(currentUser);

  if (!employeeId) return [];

  return tasks.filter((task) => task.assignedTo === employeeId);
};

// "2026-08-15" → "Aug 15, 2026"
export const formatDate = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "No due date";

// "Bhumika Gautam" → "BG"
export const initials = (name) =>
  name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "--";

// Aaj ki date YYYY-MM-DD mein — local, UTC nahi.
// Seedha toISOString() lagane par India mein ek din pichhe chala jaata hai.
export const todayInputValue = () => {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
};

// Kitne din ka farak hai — negative matlab date nikal chuki hai
const daysBetween = (from, to) =>
  Math.round(
    (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000
  );

// "2026-08-09" → "Due in 2 days" / "Due today" / "3 days overdue"
export const dueLabel = (dueDate, today) => {
  if (!dueDate) return "No due date";

  const diff = daysBetween(today, dueDate);

  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff > 1) return `Due in ${diff} days`;
  if (diff === -1) return "1 day overdue";
  return `${Math.abs(diff)} days overdue`;
};

// Due date nikal chuki hai aur task ab tak pending hai
export const isOverdue = (task, today) =>
  Boolean(task.dueDate) &&
  task.status !== COMPLETED_STATUS &&
  task.dueDate < today;

// Task mein sirf employee ki id save hai — naam employees list se aata hai
export const assigneeName = (task, employees) =>
  employees.find((employee) => employee.id === task.assignedTo)?.name ||
  task.assignedTo ||
  "Unassigned";

// Status-wise ginti — summary cards ke liye
export const taskSummary = (tasks) => ({
  total: tasks.length,
  todo: tasks.filter((task) => task.status === "To Do").length,
  active: tasks.filter((task) => task.status === "In Progress").length,
  completed: tasks.filter((task) => task.status === COMPLETED_STATUS).length,
});

// Search + status dono lagakar list chhaanti hai
export const filterTasks = (tasks, { search, statusFilter, employees, allStatuses }) => {
  const text = search.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesSearch =
      !text ||
      (task.title || "").toLowerCase().includes(text) ||
      assigneeName(task, employees).toLowerCase().includes(text);

    const matchesStatus =
      statusFilter === allStatuses || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
};

// Error ho to laal border wala input, warna normal
export const fieldClass = (error) => (error ? ERROR_INPUT_CLASS : INPUT_CLASS);
