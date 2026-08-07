import { useEffect, useState } from "react";
import { FiCheckSquare, FiPlus, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  updateTaskStatus,
} from "../../services/taskService";
import { getEmployees } from "../../services/EmployeeService";
import { validateField } from "../../utils/validation/validateField";
import useAuth from "../../hooks/useAuth";
import {
  ALL_STATUSES,
  EMPTY_TASK_FORM,
  PRIMARY_BUTTON_CLASS,
} from "../../utils/tasks/taskConstants";
import {
  filterOwnTasks,
  filterTasks,
  getCurrentEmployeeId,
  isManager,
  taskSummary,
} from "../../utils/tasks/taskUtils";
import TaskPageHeader from "../../components/tasks/TaskPageHeader";
import TaskSummaryCards from "../../components/tasks/TaskSummaryCards";
import TaskFilters from "../../components/tasks/TaskFilters";
import TaskTable from "../../components/tasks/TaskTable";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import DeleteTaskModal from "../../components/tasks/DeleteTaskModal";
import Loader from "../../components/common/Loader";

/*
|--------------------------------------------------------------------------
| All Tasks
|--------------------------------------------------------------------------
| Poori company ke tasks. Ye page sirf teen kaam karta hai:
|   1. state rakhna
|   2. Firebase se baat karna (service ke through)
|   3. components ko jodna
| Dikhne ka saara kaam components/tasks/ mein hai.
|--------------------------------------------------------------------------
*/

function AllTasks() {
  const companyCode = localStorage.getItem("companyCode");
  const { currentUser } = useAuth();

  // Owner/HR poora board chalate hain — assign, edit, delete.
  // Employee sirf apne tasks dekhta hai aur unka status badal sakta hai.
  const canManage = isManager(currentUser);

  // HR khud bhi employee hai, isliye uske apne tasks ho sakte hain.
  // Owner ka employee record hota hi nahi — uske liye toggle bekaar hai.
  const canSeeOwnTasks = canManage && Boolean(getCurrentEmployeeId(currentUser));

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // page-level error
  const [errors, setErrors] = useState({}); // form ke field-wise errors
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // Kaunsa task edit ho raha hai — null matlab naya task ban raha hai
  const [editingTask, setEditingTask] = useState(null);
  // Kaunsa task delete hone ja raha hai — null matlab modal band
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  // "all" ya "mine" — sirf manager ke liye, employee ko hamesha apne hi dikhte hain
  const [scope, setScope] = useState("all");
  const [formData, setFormData] = useState(EMPTY_TASK_FORM);

  // Ek hi jagah se list refresh — create/status/delete teeno yahi bulate hain
  const refreshTasks = async () => {
    setTasks(await getTasks(companyCode));
  };

  // Page khulte hi ek baar tasks laao
  useEffect(() => {
    if (!companyCode) {
      setError("Company code not found. Please log in again.");
      setLoading(false);
      return;
    }

    getTasks(companyCode)
      .then((data) => {
        setTasks(data);
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

  // Employees dropdown aur Assignee column ke liye — ek hi baar.
  // Employee ke paas dono nahi hain, isliye uske liye ye call chalti hi nahi.
  // Fail ho to page-level error nahi — task list to theek hai.
  useEffect(() => {
    if (!companyCode || !canManage) return;

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
  }, [companyCode, canManage]);

  // Employee ko hamesha sirf apne tasks. Manager ko sab, jab tak wo khud
  // "My tasks" na chune. Filter browser mein hota hai — attendance requests
  // module bhi yahi karta hai (filterOwnRequests).
  const showOnlyMine = !canManage || scope === "mine";
  const roleTasks = showOnlyMine
    ? filterOwnTasks(tasks, currentUser)
    : tasks;

  const summary = taskSummary(roleTasks);
  const visibleTasks = filterTasks(roleTasks, {
    search,
    statusFilter,
    employees,
    allStatuses: ALL_STATUSES,
  });

  // Ek field badle to uska error hata do
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  // Naya task — khaali form
  const openCreateForm = () => {
    setEditingTask(null);
    setFormData(EMPTY_TASK_FORM);
    setErrors({});
    setShowForm(true);
  };

  // Edit — task ki maujooda values form mein bhar do
  const openEditForm = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      dueDate: task.dueDate || "",
      priority: task.priority || EMPTY_TASK_FORM.priority,
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setErrors({});
  };

  // Create aur Edit dono yahi se — sirf aakhri call alag hai
  const handleSubmit = async () => {
    // rules.js se validation
    const fieldErrors = {
      title: validateField("taskTitle", formData.title),
      description: validateField("taskDescription", formData.description),
      assignedTo: validateField("taskAssignee", formData.assignedTo),
      dueDate: validateField("taskDueDate", formData.dueDate),
    };

    // Edit mein purani due date wale task ko "past date" kehkar rok dena galat
    // hoga — isliye date na badli ho to wo check chhod dete hain
    if (editingTask && formData.dueDate === editingTask.dueDate) {
      fieldErrors.dueDate = "";
    }

    // Koi bhi error hai to ruk jao
    if (Object.values(fieldErrors).some(Boolean)) {
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    setSaving(true);
    try {
      if (editingTask) {
        await updateTask(companyCode, editingTask.id, payload);
      } else {
        await createTask(companyCode, payload);
      }

      await refreshTasks();

      setFormData(EMPTY_TASK_FORM);
      setErrors({});
      setShowForm(false);
      setEditingTask(null);
      toast.success(
        editingTask ? "Task updated successfully." : "Task created successfully.",
      );
    } catch (err) {
      console.error("Failed to save task:", err);
      toast.error(
        editingTask ? "Unable to update the task." : "Unable to create the task.",
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, status) => {
    try {
      await updateTaskStatus(companyCode, task.id, status);
      await refreshTasks();
      toast.success(`Task moved to ${status}.`);
    } catch (err) {
      console.error("Failed to update task status:", err);
      toast.error("Unable to update task status.");
    }
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;

    setDeleting(true);
    try {
      await deleteTask(companyCode, taskToDelete.id);
      await refreshTasks();
      setTaskToDelete(null);
      toast.success("Task deleted successfully.");
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Unable to delete the task.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader text="Loading tasks..." />;

  return (
    <div className="p-2">
      <TaskPageHeader
        title="Tasks"
        subtitle={
          canManage
            ? "Plan work, keep ownership clear, and stay ahead of deadlines"
            : "Everything assigned to you, in one place"
        }
        icon={<FiCheckSquare />}
        action={
          canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className={PRIMARY_BUTTON_CLASS}
            >
              <FiPlus />
              Create task
            </button>
          )
        }
      />

      <div className="mt-6 space-y-6">
        {error && (
          <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="cursor-pointer rounded-lg p-1 transition hover:bg-red-100"
            >
              <FiX size={18} />
            </button>
          </div>
        )}

        <TaskSummaryCards summary={summary} />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                Task overview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleTasks.length} task
                {visibleTasks.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <TaskFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            scope={scope}
            onScopeChange={setScope}
            showScope={canSeeOwnTasks}
          />
        </div>

          <TaskTable
            tasks={visibleTasks}
            employees={employees}
            hasTasks={roleTasks.length > 0}
            canManage={canManage}
            onStatusChange={changeStatus}
            onEdit={openEditForm}
            onDelete={setTaskToDelete}
            onCreate={canManage ? openCreateForm : undefined}
          />
        </div>
      </div>

      <CreateTaskModal
        open={showForm}
        isEdit={Boolean(editingTask)}
        formData={formData}
        errors={errors}
        employees={employees}    //state modal ko bheji jati hai
        saving={saving}
        onChange={updateField}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      <DeleteTaskModal
        open={Boolean(taskToDelete)}
        task={taskToDelete}
        deleting={deleting}
        onConfirm={confirmDelete}
        onClose={() => setTaskToDelete(null)}
      />
    </div>
  );
}

export default AllTasks;
