import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  COMPLETED_STATUS,
  getTasks,
  updateTaskStatus,
} from "../services/taskService";
import { getEmployees } from "../services/EmployeeService";
import useAuth from "../hooks/useAuth";
import { PRIORITY_STYLES } from "../utils/tasks/taskConstants";
import {
  assigneeName,
  dueLabel,
  filterOwnTasks,
  isManager,
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

  // Manager ko sabke tasks, employee ko sirf apne
  const canManage = isManager(currentUser);

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  // Session hi nahi hai to na loader dikhana hai, na koi call karni hai
  const [loading, setLoading] = useState(Boolean(companyCode));
  const [error, setError] = useState("");

  const today = todayInputValue();

  const loadTasks = () => {
    setError("");

    getTasks(companyCode)
      .then((data) => {
        const windowEnd = dateAfterDays(DUE_WINDOW_DAYS);

        const mine = canManage ? data : filterOwnTasks(data, currentUser);

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
      })
      .catch((err) => {
        console.error("Failed to load tasks:", err);
        setError("Unable to load tasks.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!companyCode) return;

    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyCode]);

  // Naam dikhane ke liye — task mein sirf employee ki id hoti hai.
  // Employee ko naam dikhta hi nahi (sab uske apne hain), isliye uske liye skip.
  useEffect(() => {
    if (!companyCode || !canManage) return;

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
  }, [companyCode, canManage]);

  const completeTask = async (task) => {
    // Turant list se hata do — wapas laane ke liye purani list rakh li hai
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      await updateTaskStatus(companyCode, task.id, COMPLETED_STATUS);
      toast.success("Task marked as completed.");
    } catch (err) {
      console.error("Failed to complete task:", err);
      setTasks(previous);
      toast.error("Unable to update the task.");
    }
  };

  const visible = tasks.slice(0, VISIBLE_LIMIT);
  const hiddenCount = tasks.length - visible.length;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Today's Tasks</h2>

        <button
          onClick={() => navigate("/tasks")}
          className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          View All
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Loading tasks...
        </p>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              loadTasks();
            }}
            className="mt-3 cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            Retry
          </button>
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

          {canManage && (
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
              className="flex items-start gap-4 py-4 border-b border-gray-200 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => completeTask(task)}
                aria-label={`Mark ${task.title} as completed`}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-gray-700">{task.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {canManage ? `${assigneeName(task, employees)} · ` : ""}
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
