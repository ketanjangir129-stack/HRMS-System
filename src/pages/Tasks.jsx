import { useEffect, useState } from "react";
import { createTask, getTasks } from "../services/taskService";
import { getEmployees } from "../services/EmployeeService";
import { validateField } from "../utils/validation/validateField";
import Loader from "../components/common/Loader";
import { toast } from "react-toastify";

function Tasks() {
  const companyCode = localStorage.getItem("companyCode");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // page-level error
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "Medium",
  });
  const [errors, setErrors] = useState({}); // form ke field-wise errors
  const [saving, setSaving] = useState(false);

  // Page khulte hi ek baar tasks laao
  useEffect(() => {
    if (!companyCode) {
      setError("Company code not found. Please log in again.");
      setLoading(false);
      return;
    }

    getTasks(companyCode)
      .then((data) => {
        setTasks(data); //screen dubara bnti h
        setError("");
      })
      .catch((err) => {
        console.error("Failed to load tasks:", err);
        setError("Unable to load tasks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [companyCode]);

  // Employees laane ke liye ek aur useEffect
  useEffect(() => {
    if (!companyCode) return;

    getEmployees(companyCode)
      .then((data) => {
        // Firebase ki key hi employeeId hai
        const list = Object.entries(data).map(([id, employee]) => ({
          id,
          name: employee.personalInfo?.name || id,
        }));
        setEmployees(list.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => {
        console.error("Failed to load employees:", err);
      });
  }, [companyCode]);

  // Ek field badle to uska error hata do
  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const handleCreate = async () => {
    // rules.js se validation
    const fieldErrors = {
      title: validateField("taskTitle", formData.title),
      description: validateField("taskDescription", formData.description),
      assignedTo: validateField("taskAssignee", formData.assignedTo),
      dueDate: validateField("taskDueDate", formData.dueDate),
    };

    // Koi bhi error hai to ruk jao
    if (Object.values(fieldErrors).some(Boolean)) {
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await createTask(companyCode, {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
      });

      // List dobara laao — nayi task dikhegi
      setTasks(await getTasks(companyCode));

      // Form khaali karke modal band
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "Medium",
      });
      setErrors({});
      setShowForm(false);
      toast.success("Task created successfully.");
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("Unable to create the task.");
    } finally {
      setSaving(false);
    }
  };

  // Loader yahan — useEffect ke baad, return se pehle
  if (loading) return <Loader text="Loading tasks..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Tasks
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Plan work, keep ownership clear, and stay ahead of deadlines.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          + Create task
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Task overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            {tasks.length} task{tasks.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Task</th>
                <th className="px-6 py-3.5 font-semibold">Assignee</th>
                <th className="px-6 py-3.5 font-semibold">Due date</th>
                <th className="px-6 py-3.5 font-semibold">Priority</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-slate-800">
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {task.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {/* Naam employees list se — task mein sirf id save hai */}
                    {employees.find((e) => e.id === task.assignedTo)?.name ||
                      task.assignedTo ||
                      "Unassigned"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.dueDate || "No due date"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.priority || "Medium"}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.status}
                  </td>
                </tr>
              ))}

              {tasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <p className="font-medium text-slate-700">No tasks yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Create your first task to start tracking work.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Create task</h2>
            <p className="mt-1 text-sm text-slate-500">
              Assign a clear owner and deadline.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                <span className="mb-1.5 block">Task title</span>
                <input
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Review monthly attendance"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {errors.title && (
                  <span className="mt-1 block text-xs font-medium text-rose-600">
                    {errors.title}
                  </span>
                )}
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                <span className="mb-1.5 block">Description (optional)</span>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What exactly needs to be done?"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                {errors.description && (
                  <span className="mt-1 block text-xs font-medium text-rose-600">
                    {errors.description}
                  </span>
                )}
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                <span className="mb-1.5 block">Assign to</span>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => updateField("assignedTo", e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select an employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.id})
                    </option>
                  ))}
                </select>
                {errors.assignedTo && (
                  <span className="mt-1 block text-xs font-medium text-rose-600">
                    {errors.assignedTo}
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-1.5 block">Due date</span>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {errors.dueDate && (
                    <span className="mt-1 block text-xs font-medium text-rose-600">
                      {errors.dueDate}
                    </span>
                  )}
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  <span className="mb-1.5 block">Priority</span>
                  <select
                    value={formData.priority}
                    onChange={(e) => updateField("priority", e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
