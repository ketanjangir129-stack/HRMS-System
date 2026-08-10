import { COMPLETED_STATUS } from "../../services/taskService";
import { ERROR_INPUT_CLASS, INPUT_CLASS } from "./taskConstants";

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
| Identity
|--------------------------------------------------------------------------
| Permissions ab useRoleAccess() / canAccessSection("tasks.*") se aati hain
| — poore project jaisa. Yahan sirf "main kaun hun" bachta hai, "main kya
| kar sakta hun" nahi.
|--------------------------------------------------------------------------
*/

/*
| Task kisne banaya — ownership ke liye createdById use hota hai, createdBy
| nahi. createdBy display naam hai aur do logon ka naam same ho sakta hai.
|
| employeeId khaali ho to hamesha false: Owner ka employee record nahi hota
| (""), aur purane tasks mein createdById undefined hai — dono ko match hone
| se rokna zaroori hai.
*/
export const isTaskCreator = (task, employeeId) =>
  Boolean(employeeId) && task?.createdById === employeeId;

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

/*
| createdAt / updatedAt millisecond timestamp hain (Date.now()), dueDate ki
| tarah "YYYY-MM-DD" string nahi. Isliye inka apna formatter chahiye —
| timestamp formatDate() mein daalne par "Invalid Date" banta hai.
|
| 1754640000000 → "Aug 08, 2026, 4:30 PM"
*/
export const formatTimestamp = (ms) =>
  ms
    ? new Date(ms).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "--";

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

// Status-wise ginti — summary cards aur Task Progress dono ke liye.
// today optional hai taaki purane call (sirf tasks ke saath) bhi chalte rahein.
export const taskSummary = (tasks, today = todayInputValue()) => ({
  total: tasks.length,
  todo: tasks.filter((task) => task.status === "To Do").length,
  active: tasks.filter((task) => task.status === "In Progress").length,
  completed: tasks.filter((task) => task.status === COMPLETED_STATUS).length,
  // Aaj due hai aur ab tak pending — jo ho chuka wo "due" nahi kehlaata
  dueToday: tasks.filter(
    (task) => task.status !== COMPLETED_STATUS && task.dueDate === today
  ).length,
  overdue: tasks.filter((task) => isOverdue(task, today)).length,
});

/*
|--------------------------------------------------------------------------
| Task Progress
|--------------------------------------------------------------------------
| Teen status ka distribution — inka jod hamesha total hota hai, isliye ye
| ek hi stacked bar mein aa sakte hain.
|
| Overdue ko jaan-boojhkar isse bahar rakha hai: wo chautha status nahi,
| To Do aur In Progress ke andar ka subset hai. Chaaron ko ek bar mein
| jodne par total 100% se zyada ho jaata. Isliye uska apna % hai — pending
| ke against, total ke against nahi.
|--------------------------------------------------------------------------
*/
export const taskProgress = (summary) => {
  const total = summary.total || 0;

  // Total 0 ho to divide by zero NaN de dega
  const percent = (value) => (total ? Math.round((value / total) * 100) : 0);

  // Bar ki width ke liye bina round kiya hua share — teen rounded percent
  // jodne par 99% ya 101% ban jaate hain aur bar mein khaali jagah dikhti hai
  const share = (value) => (total ? (value / total) * 100 : 0);

  const pending = total - summary.completed;

  return {
    total,
    pending,
    completionRate: percent(summary.completed),
    segments: [
      {
        label: "To Do",
        value: summary.todo,
        percent: percent(summary.todo),
        share: share(summary.todo),
      },
      {
        label: "In Progress",
        value: summary.active,
        percent: percent(summary.active),
        share: share(summary.active),
      },
      {
        label: "Completed",
        value: summary.completed,
        percent: percent(summary.completed),
        share: share(summary.completed),
      },
    ],
    overdue: summary.overdue,
    overduePercent: pending
      ? Math.round((summary.overdue / pending) * 100)
      : 0,
  };
};

/*
|--------------------------------------------------------------------------
| Team Workload
|--------------------------------------------------------------------------
| Employee-wise ginti. Sirf un logon ki row banti hai jinke paas task hai —
| employees list se nahi, tasks se banti hai. Isliye jis employee ka record
| delete ho gaya ho uski row bhi dikhegi (naam ki jagah uski id, kyunki
| assigneeName wahi fallback deta hai).
|--------------------------------------------------------------------------
*/
export const teamWorkload = (tasks = [], employees = []) => {
  const rows = new Map();

  tasks.forEach((task) => {
    if (!task.assignedTo) return;

    const row = rows.get(task.assignedTo) || {
      id: task.assignedTo,
      name: assigneeName(task, employees),
      total: 0,
      todo: 0,
      active: 0,
      completed: 0,
    };

    row.total += 1;

    if (task.status === COMPLETED_STATUS) row.completed += 1;
    else if (task.status === "In Progress") row.active += 1;
    else row.todo += 1;

    rows.set(task.assignedTo, row);
  });

  // Sabse zyada load sabse upar, barabar ho to naam se
  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
  );
};

// Overdue ya High priority — jo ho chuka usme urgent kuch nahi, isliye
// Completed bahar. Overdue pehle, uske baad sabse jaldi wali due date.
export const urgentTasks = (
  tasks = [],
  today = todayInputValue(),
  limit = 5
) =>
  tasks
    .filter(
      (task) =>
        task.status !== COMPLETED_STATUS &&
        (isOverdue(task, today) || task.priority === "High")
    )
    .sort((a, b) => {
      const aOverdue = isOverdue(a, today);
      const bOverdue = isOverdue(b, today);

      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

      // Bina due date wale sabse aakhir mein
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, limit);

// Jo sabse haal mein bana ya badla. Service already createAt desc bhejti hai,
// par edit/status change ke baad updatedAt hi sahi order deta hai.
const lastTouched = (task) => Math.max(task.updatedAt || 0, task.createdAt || 0);

// Spread zaroori hai — tasks seedha state se aata hai, use sort() se mutate
// karna React ke liye galat hai
export const recentTasks = (tasks = [], limit = 5) =>
  [...tasks].sort((a, b) => lastTouched(b) - lastTouched(a)).slice(0, limit);

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
