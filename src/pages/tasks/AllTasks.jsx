import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheckSquare, FiPlus, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  createTask,
  deleteTask,
  IN_PROGRESS_STATUS,
  subscribeTasks,
  updateTask,
  updateTaskStatus,
} from "../../services/taskService";
import { getEmployees } from "../../services/EmployeeService";
import { validateField } from "../../utils/validation/validateField";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import usePagination from "../../hooks/usePagination";
import {
  ALL_STATUSES,
  EMPTY_TASK_FORM,
  PRIMARY_BUTTON_CLASS,
  SECTION_ROW_LIMIT,
  TASK_CONTEXT,
  TASK_CONTEXT_LABELS,
} from "../../utils/tasks/taskConstants";
import {
  filterOwnTasks,
  filterTasks,
  getCurrentActor,
  getCurrentEmployeeId,
  isTaskCreator,
  recentTasks,
  runningTasksOf,
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
import TaskDetailsModal from "../../components/tasks/TaskDetailsModal";
import TaskActivityModal from "../../components/tasks/TaskActivityModal";
import Pagination from "../../components/common/pagination/Pagination";
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

  // Owner Settings se ye sab on/off karta hai. Owner ke liye hamesha true.
  const { canAccessSection } = useRoleAccess();

  const canViewAll = canAccessSection("tasks.viewAll");
  const showProgress = canAccessSection("tasks.progress");
  const showWorkload = canAccessSection("tasks.workload");
  const showUrgent = canAccessSection("tasks.urgent");
  const showRecent = canAccessSection("tasks.recent");
  const canCreateTask = canAccessSection("tasks.create");
  const canCreateOwn = canAccessSection("tasks.createOwn");
  const canUpdateTask = canAccessSection("tasks.update");
  const canUpdateOwn = canAccessSection("tasks.updateOwn");
  const canDeleteTask = canAccessSection("tasks.delete");
  // Activity sirf padhne wali cheez hai — uska haq edit/delete se bilkul
  // alag chalta hai, isliye Actions column se bahar apna column
  const canViewActivity = canAccessSection("tasks.activity");

  // Ownership isi se tay hoti hai — createdBy (naam) se nahi
  const myEmployeeId = getCurrentEmployeeId(currentUser);

  /*
  | Jisko kisi ko assign karne ka haq nahi par apne liye bana sakta hai —
  | uska assignee khud tay hota hai, form mein choice nahi milti. Yahi leave
  | module karta hai: ApplyLeaveModal mein employee selector hai hi nahi.
  |
  | Employee record zaroori hai, warna assignedTo khaali reh jaata.
  */
  const selfAssignOnly =
    !canCreateTask && canCreateOwn && Boolean(myEmployeeId);

  const canOpenCreate = canCreateTask || selfAssignOnly;

  // Owner/HR har task edit karte hain, baaki sirf apna banaya hua.
  // Per-row check — ek global boolean se kaam nahi chalta.
  const canEditTask = (task) =>
    canUpdateTask || (canUpdateOwn && isTaskCreator(task, myEmployeeId));

  // Actions column ka faisla — kisi bhi task par kuch kar sakte ho ya nahi.
  // Filtered list se nahi nikalte, warna column aata-jaata rehta.
  const canActOnTasks = canUpdateTask || canUpdateOwn || canDeleteTask;

  // Naam chahiye Assignee column, workload aur assign dropdown ke liye
  const needsEmployees = canViewAll || showWorkload || canCreateTask;

  /*
  | Kisne kaam kiya — createdBy/createdById par bhi yahi jaata hai aur
  | activity entries par bhi, isliye ek hi jagah se aana chahiye. Chain
  | pehle yahin khuli padi thi; ab taskUtils mein hai taaki dashboard card
  | bhi wahi naam likhe.
  */
  const actor = getCurrentActor(currentUser);

  // Toggle tabhi, jab sabke tasks dekh sakte ho AUR apna employee record ho.
  // Owner ka record hota hi nahi — uske liye toggle bekaar hai.
  const canSeeOwnTasks = canViewAll && Boolean(myEmployeeId);

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
  // Sirf id — poora object rakhte to modal purani copy par atak jaata
  const [viewingTaskId, setViewingTaskId] = useState(null);
  // Activity modal bhi sirf id rakhta hai — poora object rakhte to modal
  // khula rehte hue nayi entry usme nahi pahunchti
  const [activityTaskId, setActivityTaskId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  // "all" ya "mine" — sirf manager ke liye, employee ko hamesha apne hi dikhte hain
  const [scope, setScope] = useState("all");
  // Kaunse section ka "View all" daba — khaali matlab poori list
  const [tableContext, setTableContext] = useState(TASK_CONTEXT.ALL);
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

  // Employees dropdown, Assignee column aur workload ke liye — ek hi baar.
  // Jise inme se kuch nahi dikhta uske liye ye call chalti hi nahi.
  // Fail ho to page-level error nahi — task list to theek hai.
  useEffect(() => {
    if (!companyCode || !needsEmployees) return;

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
  }, [companyCode, needsEmployees]);

  // tasks.viewAll na ho to hamesha sirf apne tasks. Ho to sab, jab tak khud
  // "My tasks" na chune. Filter browser mein hota hai — attendance requests
  // module bhi yahi karta hai (filterOwnRequests).
  const showOnlyMine = !canViewAll || scope === "mine";
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

  /*
  | Table ke liye wahi do helpers, bas bina limit — Infinity se slice poori
  | list de deta hai. Section aur table ek hi definition par chalte hain,
  | isliye "View all" mein sach mein wahi tasks dikhte hain.
  */
  const contextTasks = useMemo(() => {
    if (tableContext === TASK_CONTEXT.URGENT) {
      return urgentTasks(roleTasks, today, Infinity);
    }

    if (tableContext === TASK_CONTEXT.RECENT) {
      return recentTasks(roleTasks, Infinity);
    }

    return roleTasks;
  }, [tableContext, roleTasks, today]);

  // Search aur status filter context ke upar lagte hain, uski jagah nahi
  const visibleTasks = filterTasks(contextTasks, {
    search,
    statusFilter,
    employees,
    allStatuses: ALL_STATUSES,
  });

  /*
  | Table sirf ek page ki rows dikhata hai — wahi common pagination jo
  | Employees page use karta hai (usePagination + Pagination).
  */
  const {
    paginatedData: paginatedTasks,
    currentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    pageSize,
    goToPage,
    changePageSize,
    resetPagination,
  } = usePagination({
    data: visibleTasks,
    initialPageSize: 5,
  });

  // Filter/scope/context badla to list hi nayi hai — page 1 par wapas
  useEffect(() => {
    resetPagination();
  }, [search, statusFilter, scope, tableContext]);

  // roleTasks se — jo dikhta nahi uski detail bhi nahi khulni chahiye
  const viewingTask = useMemo(
    () => roleTasks.find((task) => task.id === viewingTaskId) || null,
    [roleTasks, viewingTaskId]
  );

  /*
  | Activity bhi wahi jodi — id se har render par taaza task nikalta hai,
  | isliye modal khula rehte hue koi status badle to nayi entry apne aap
  | list mein aa jaati hai. Task delete ho jaye to null, aur modal khud
  | band ho jaata hai.
  */
  const activityTask = useMemo(
    () => roleTasks.find((task) => task.id === activityTaskId) || null,
    [roleTasks, activityTaskId]
  );

  // "View all" — us section ka context lagao, status filter hatao, table par jao
  const showTableContext = (context) => {
    setTableContext(context);
    setStatusFilter(ALL_STATUSES);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Ek field badle to uska error hata do
  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  // Naya task — khaali form. Self-assign wale ka assignee pehle se bhara,
  // taaki required validation pass ho jaye (form mein field dikhti hi nahi).
  const openCreateForm = () => {
    setEditingTask(null);
    setFormData({
      ...EMPTY_TASK_FORM,
      assignedTo: selfAssignOnly ? myEmployeeId : "",
    });
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

    /*
    | assignedTo yahan force hota hai, sirf UI prefill par bharosa nahi.
    | Jise assign karne ka haq nahi uska task hamesha uske hi naam par
    | jaata hai — create par bhi, edit par bhi.
    */
    const payload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignedTo: selfAssignOnly ? myEmployeeId : formData.assignedTo,
    };

    setSaving(true);
    try {
      if (editingTask) {
        // Audit fields nahi bhejte — updateTask khud sirf editable fields
        // chhaanta hai, to createdBy/createdById/createdAt bache rehte hain
        await updateTask(companyCode, editingTask.id, payload);
      } else {
        await createTask(companyCode, {
          ...payload,
          createdBy: actor.name,
          createdById: actor.id,
        });
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

  /*
  | Ek employee ek waqt par ek hi task par kaam kar sakta hai. Isliye task
  | start karte waqt uske baaki chal rahe tasks Paused ho jaate hain — user
  | ko pehle unhe khud rokna nahi padta.
  |
  | Dono badlaav service ek hi write mein bhejti hai, isliye list kabhi do
  | task In Progress dikhati nahi.
  */
  const changeStatus = async (task, status) => {
    const running =
      status === IN_PROGRESS_STATUS
        ? runningTasksOf(tasks, task.assignedTo, task.id)
        : [];

    try {
      const changed = await updateTaskStatus(companyCode, task, status, {
        actor,
        pauseTasks: running,
      });

      // Wahi status dobara chuna gaya — kuch likha hi nahi gaya, to kehne
      // ko bhi kuch nahi
      if (!changed) return;

      // Kaunsa task apne aap ruka, ye batana zaroori hai — warna user ko
      // lagta hai list apne aap badal gayi
      toast.success(
        running.length === 1
          ? `Task moved to ${status}. "${running[0].title}" paused.`
          : running.length > 1
            ? `Task moved to ${status}. ${running.length} tasks paused.`
            : `Task moved to ${status}.`
      );
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
          canViewAll
            ? "Plan work, keep ownership clear, and stay ahead of deadlines"
            : "Everything assigned to you, in one place"
        }
        icon={<FiCheckSquare />}
        action={
          canOpenCreate && (
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
          Har panel apni permission par. Ek chhip jaye to doosra poori chaudai
          le leta hai — Dashboard.jsx bhi yahi karta hai.
          Summary cards bahar hain: unme koi assignee naam nahi aata.
        */}
        {(showProgress || showWorkload) && (
          <div
            className={`grid grid-cols-1 gap-6 ${
              showProgress && showWorkload ? "lg:grid-cols-3" : ""
            }`}
          >
            {showProgress && <TaskProgress progress={progress} />}

            {showWorkload && (
              <TeamWorkload
                workload={workload}
                className={showProgress ? "lg:col-span-2" : ""}
              />
            )}
          </div>
        )}

        {(showUrgent || showRecent) && (
          <div
            className={`grid grid-cols-1 gap-6 ${
              showUrgent && showRecent ? "lg:grid-cols-2" : ""
            }`}
          >
            {showUrgent && (
              <UrgentTasks
                tasks={urgent}
                employees={employees}
                today={today}
                onViewAll={() => showTableContext(TASK_CONTEXT.URGENT)}
              />
            )}

            {showRecent && (
              <RecentTasks
                tasks={recent}
                employees={employees}
                onViewAll={() => showTableContext(TASK_CONTEXT.RECENT)}
              />
            )}
          </div>
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

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm text-slate-500">
                  {visibleTasks.length} task
                  {visibleTasks.length === 1 ? "" : "s"} shown
                </p>

                {/*
                  Kaunsa section ka view chal raha hai. Pill ka look
                  AttendancePanel ke LiveBadge se, aur × wahi jo upar
                  error banner mein hai.
                */}
                {tableContext !== TASK_CONTEXT.ALL && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-700">
                    Showing: {TASK_CONTEXT_LABELS[tableContext]}
                    <button
                      type="button"
                      onClick={() => setTableContext(TASK_CONTEXT.ALL)}
                      aria-label="Show all tasks"
                      title="Show all tasks"
                      className="cursor-pointer rounded-full p-0.5 transition hover:bg-blue-100"
                    >
                      <FiX size={14} />
                    </button>
                  </span>
                )}
              </div>
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
            tasks={paginatedTasks}
            employees={employees}
            hasTasks={contextTasks.length > 0}
            showAssignee={canViewAll}
            canUpdate={canEditTask}
            canDelete={canDeleteTask}
            showActions={canActOnTasks}
            showActivity={canViewActivity}
            onStatusChange={changeStatus}
            onEdit={openEditForm}
            onDelete={setTaskToDelete}
            onRowClick={(task) => setViewingTaskId(task.id)}
            onActivityClick={(task) => setActivityTaskId(task.id)}
            onCreate={canOpenCreate ? openCreateForm : undefined}
          />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startItem={startItem}
            endItem={endItem}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
          />
        </div>
      </div>

      <CreateTaskModal
        open={showForm}
        isEdit={Boolean(editingTask)}
        formData={formData}
        errors={errors}
        employees={employees}    //state modal ko bheji jati hai
        // true ho to assignee field dikhti hi nahi — task khud ke naam par
        selfAssign={selfAssignOnly}
        saving={saving}
        onChange={updateField}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      <TaskDetailsModal
        open={Boolean(viewingTask)}
        task={viewingTask}
        employees={employees}
        showAssignee={canViewAll}
        onClose={() => setViewingTaskId(null)}
      />

      <TaskActivityModal
        open={Boolean(activityTask)}
        task={activityTask}
        onClose={() => setActivityTaskId(null)}
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
