import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheckSquare, FiPlus, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  createTask,
  deleteTask,
  subscribeTasks,
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
  SECTION_ROW_LIMIT,
} from "../../utils/tasks/taskConstants";
import {
  filterOwnTasks,
  filterTasks,
  getCurrentEmployeeId,
  isManager,
  recentTasks,
  taskProgress,
  taskSummary,
  teamWorkload,
  todayInputValue,
  urgentTasks,
} from "../../utils/tasks/taskUtils";
import TaskPageHeader from "../../components/tasks/TaskPageHeader";
import TaskSummaryCards from "../../components/tasks/TaskSummaryCards";
import TaskProgress from "../../components/tasks/TaskProgress";
import TeamWorkload from "../../components/tasks/TeamWorkload";
import UrgentTasks from "../../components/tasks/UrgentTasks";
import RecentTasks from "../../components/tasks/RecentTasks";
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

  // Dashboard sections ka "View all" isi table par scroll karta hai —
  // naya page nahi khulta, wahi list neeche pehle se maujood hai
  const tableRef = useRef(null);

  // Tasks realtime — create/edit/delete ke baad list khud update ho jaati hai,
  // aur doosre user ka change bhi bina refresh dikh jaata hai.
  useEffect(() => {
    if (!companyCode) {
      setError("Company code not found. Please log in again.");
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeTasks(
      companyCode,
      (data) => {
        setTasks(data);
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load tasks:", err);
        setError("Unable to load tasks.");
        setLoading(false);
      }
    );

    // Page chhodte hi listener band — warna wo chalta rehta hai
    return unsubscribe;
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
  const roleTasks = useMemo(
    () => (showOnlyMine ? filterOwnTasks(tasks, currentUser) : tasks),
    [showOnlyMine, tasks, currentUser]
  );

  // Local "today" — todayInputValue() timezone sambhaal leta hai
  const today = todayInputValue();

  /*
  | Dashboard ka saara data yahin se banta hai — usi roleTasks se jo table
  | use karta hai, isliye cards aur table kabhi alag baat nahi kehte.
  |
  | useMemo isliye ki subscribeTasks realtime listener hai: har chhote update
  | par ye ginti dobara na ho.
  */
  const summary = useMemo(() => taskSummary(roleTasks, today), [roleTasks, today]);
  const progress = useMemo(() => taskProgress(summary), [summary]);
  const workload = useMemo(
    () => teamWorkload(roleTasks, employees),
    [roleTasks, employees]
  );
  const urgent = useMemo(
    () => urgentTasks(roleTasks, today, SECTION_ROW_LIMIT),
    [roleTasks, today]
  );
  const recent = useMemo(
    () => recentTasks(roleTasks, SECTION_ROW_LIMIT),
    [roleTasks]
  );

  const visibleTasks = filterTasks(roleTasks, {
    search,
    statusFilter,
    employees,
    allStatuses: ALL_STATUSES,
  });

  // "View all" — filter hata do taaki poori list dikhe, phir table par le jao
  const viewAllTasks = () => {
    setStatusFilter(ALL_STATUSES);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

      // List khud update ho jaayegi — subscribeTasks listener se

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
    // space-y-6 — header ab khud ek card hai, isliye gap poore page ka ek jaisa
    <div className="space-y-6 p-2">
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

      <div className="space-y-6">
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

        {/*
          Dashboard sections sirf Owner/HR ke liye — wahi guard jo Create
          button aur TaskTable ka Assignee column use karte hain.

          Employee ke liye do wajah se chhipe hain:
            1. getEmployees() uske liye chalti hi nahi (neeche wala effect
               canManage par rukta hai), to employees khaali rehti hai aur
               assigneeName() naam ki jagah raw Firebase id de deta hai
            2. "Team workload" ka matlab hi nahi — usko sirf apne tasks
               dikhte hain, to us list mein wo akela hota hai

          Summary cards jaan-boojhkar bahar hain: wo uske apne tasks par
          sahi ginti dete hain aur unme koi assignee naam nahi aata.
        */}
        {canManage && (
          <>
            {/*
              Progress patli hai, Workload chaudi — isliye desktop par 1:2 ka
              batwara. Tablet/mobile par dono neeche-oopar stack ho jaate hain.
            */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <TaskProgress progress={progress} />

              <TeamWorkload workload={workload} className="lg:col-span-2" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UrgentTasks
                tasks={urgent}
                employees={employees}
                today={today}
                onViewAll={viewAllTasks}
              />

              <RecentTasks
                tasks={recent}
                employees={employees}
                onViewAll={viewAllTasks}
              />
            </div>
          </>
        )}

        {/* ref — dono "View all" isi card par scroll karte hain */}
        <div
          ref={tableRef}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
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
