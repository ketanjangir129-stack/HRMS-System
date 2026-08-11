import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  COMPLETED_STATUS,
  subscribeTasks,
  updateTaskStatus,
} from "../services/taskService";
import { getEmployees } from "../services/EmployeeService";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import { PRIORITY_STYLES } from "../utils/tasks/taskConstants";
import {
  assigneeName,
  dueLabel,
  filterOwnTasks,
  todayInputValue,
} from "../utils/tasks/taskUtils";

/*
|--------------------------------------------------------------------------
| Today's Tasks (Dashboard card)
|--------------------------------------------------------------------------
| Sirf wo tasks jo jaldi due hain aur ab tak pending hain. Poori list
| /tasks par hai — yahan sirf jhalak.
|--------------------------------------------------------------------------
*/

// Create form aaj se pehle ki date leta hi nahi, isliye sirf "aaj due" dikhate
// to card zyadatar din khaali rehta. Agle 7 din ka window rakha hai.
const DUE_WINDOW_DAYS = 7;

// Kitne tasks card mein dikhein — baaki "+N more" mein
const VISIBLE_LIMIT = 4;

// Aaj se N din aage ki date, YYYY-MM-DD mein
const dateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

function EmployeeTasks() {
  const navigate = useNavigate();
  const companyCode = localStorage.getItem("companyCode");
  const { currentUser } = useAuth();
  const { canAccessSection } = useRoleAccess();

  // tasks.viewAll wale ko sabke tasks, baaki ko sirf apne
  const canViewAll = canAccessSection("tasks.viewAll");
  // Dono mein se koi bhi ho to /tasks par task ban sakta hai — Employee ke
  // paas sirf createOwn hota hai
  const canCreateTask =
    canAccessSection("tasks.create") || canAccessSection("tasks.createOwn");

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  // Session hi nahi hai to na loader dikhana hai, na koi call karni hai
  const [loading, setLoading] = useState(Boolean(companyCode));
  const [error, setError] = useState("");

  const today = todayInputValue();

  // Tasks realtime — /tasks par kuch badle to card bhi turant badal jaata hai
  useEffect(() => {
    if (!companyCode) return;

    const unsubscribe = subscribeTasks(
      companyCode,
      (data) => {
        const windowEnd = dateAfterDays(DUE_WINDOW_DAYS);

        const mine = canViewAll ? data : filterOwnTasks(data, currentUser);

        const due = mine
          .filter(
            (task) =>
              task.status !== COMPLETED_STATUS &&
              task.dueDate &&
              task.dueDate <= windowEnd
          )
          // Sabse purani due date sabse upar — overdue hamesha pehle
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        setTasks(due);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load tasks:", err);
        setError("Unable to load tasks.");
        setLoading(false);
      }
    );

    // Dashboard chhodte hi listener band
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyCode, canViewAll]);

  // Naam dikhane ke liye — task mein sirf employee ki id hoti hai.
  // Employee ko naam dikhta hi nahi (sab uske apne hain), isliye uske liye skip.
  useEffect(() => {
    if (!companyCode || !canViewAll) return;

    getEmployees(companyCode)
      .then((data) => {
        setEmployees(
          Object.entries(data).map(([id, employee]) => ({
            id,
            name: employee.personalInfo?.name || id,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load employees:", err);
      });
  }, [companyCode, canViewAll]);

  const completeTask = async (task) => {
    try {
      // Row khud hat jaayegi — listener ko naya status turant mil jaata hai
      await updateTaskStatus(companyCode, task.id, COMPLETED_STATUS);
      toast.success("Task marked as completed.");
    } catch (err) {
      console.error("Failed to complete task:", err);
      toast.error("Unable to update the task.");
    }
  };

  const visible = tasks.slice(0, VISIBLE_LIMIT);
  const hiddenCount = tasks.length - visible.length;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Today's Tasks</h2>

        <button
          onClick={() => navigate("/tasks")}
          className="cursor-pointer bg-blue-600 text-white text-sm sm:text-base px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          View All
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Loading tasks...
        </p>
      ) : error ? (
        // Listener khud dobara try karta rehta hai, isliye Retry button nahi
        <div className="py-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </span>

          <div>
            <p className="font-medium text-gray-700">You're all caught up</p>
            <p className="mt-1 text-sm text-gray-400">
              Nothing due in the next {DUE_WINDOW_DAYS} days.
            </p>
          </div>

          {canCreateTask && (
            <button
              onClick={() => navigate("/tasks")}
              className="mt-1 cursor-pointer text-sm font-medium text-blue-600 transition hover:underline"
            >
              Create a task
            </button>
          )}
        </div>
      ) : (
        <>
          {visible.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 sm:gap-4 py-3 sm:py-4 border-b border-gray-200 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => completeTask(task)}
                aria-label={`Mark ${task.title} as completed`}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm sm:text-base text-gray-700">{task.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {canViewAll ? `${assigneeName(task, employees)} · ` : ""}
                  {dueLabel(task.dueDate, today)}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.Medium
                }`}
              >
                {task.priority || "Medium"}
              </span>
            </div>
          ))}

          {hiddenCount > 0 && (
            <button
              onClick={() => navigate("/tasks")}
              className="mt-4 cursor-pointer text-sm font-medium text-blue-600 transition hover:underline"
            >
              +{hiddenCount} more
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default EmployeeTasks;
