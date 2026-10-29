import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheckSquare, FiPlus, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  archiveTask,
  COMPLETED_STATUS,
  createTask,
  deleteTaskPermanently,
  fetchTaskTeam,
  IN_PROGRESS_STATUS,
  restoreTask,
  setTaskWork,
  subscribeTasks,
  subscribeTaskVersion,
  updateTask,
  updateTaskStatus,
} from "../../services/taskService";
import useEmployees from "../../hooks/useEmployees";
import useDepartments from "../../hooks/useDepartments";
import useAuth from "../../hooks/useAuth";
import useRoleAccess from "../../hooks/useRoleAccess";
import usePagination from "../../hooks/usePagination";
import useTaskFilters from "../../hooks/useTaskFilters";
import { ROLE } from "../../utils/attendance/attendanceConstants";
import { validateField } from "../../utils/validation/validateField";
import {
  ALL_STATUSES,
  EMPTY_TASK_FORM,
  PRIMARY_BUTTON_CLASS,
  SECTION_ROW_LIMIT,
  TASK_CONTEXT,
  TASK_CONTEXT_LABELS,
  TASK_PAGE_SIZE,
  TASK_VIEWS,
} from "../../utils/tasks/taskConstants";
import {
  filterOwnTasks,
  filterTasks,
  getCurrentActionUser,
  getCurrentEmployeeId,
  isOnTask,
  isOverdue,
  isTaskCreator,
  memberIdsOf,
  recentTasks,
  sortTasks,
  taskProgress,
  taskSummary,
  teamOf,
  teamWorkload,
  todayInputValue,
  urgentTasks,
  weekStartKey,
} from "../../utils/tasks/taskUtils";
import { getDateKey } from "../../utils/attendance/attendanceDate";
import TaskPageHeader from "../../components/tasks/TaskPageHeader";
import TaskSummaryCards from "../../components/tasks/TaskSummaryCards";
import TaskProgress from "../../components/tasks/TaskProgress";
import TeamWorkload from "../../components/tasks/TeamWorkload";
import UrgentTasks from "../../components/tasks/UrgentTasks";
import RecentTasks from "../../components/tasks/RecentTasks";
import TaskLayoutSwitch from "../../components/tasks/TaskLayoutSwitch";
import TaskViewTabs from "../../components/tasks/TaskViewTabs";
import TaskToolbar from "../../components/tasks/TaskToolbar";
import TaskBulkBar from "../../components/tasks/TaskBulkBar";
import TaskTable from "../../components/tasks/TaskTable";
import TaskBoard from "../../components/tasks/TaskBoard";
import TaskTeamView from "../../components/tasks/TaskTeamView";
import TaskListSkeleton from "../../components/tasks/TaskListSkeleton";
import TaskWorkingBar from "../../components/tasks/TaskWorkingBar";
import TaskDrawer from "../../components/tasks/TaskDrawer";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import DeleteTaskModal from "../../components/tasks/DeleteTaskModal";
import Pagination from "../../components/common/pagination/Pagination";

/*
|--------------------------------------------------------------------------
| All Tasks
|--------------------------------------------------------------------------
| Poori company ke tasks. Ye page sirf teen kaam karta hai:
|   1. state rakhna
|   2. server se baat karna (service ke through)
|   3. components ko jodna
| Dikhne ka saara kaam components/tasks/ mein hai.
|
| Banawat: header → summary cards (filter bhi) → tasks (List / Board /
| Team) → insights. Pehle tasks ki list cards aur panels ke beech dabi thi;
| ab wahi sabse upar hai, kyunki page isi ke liye khulta hai.
|--------------------------------------------------------------------------
*/

/*
| Kaun kisko task de sakta hai — sirf dropdown chhantne ke liye. Asli rok
| ab server par hai (backend utils/taskRules.js, wahi list); yahan galat
| naam chun bhi liya to save par server mana kar deta hai.
|
|   Owner    - koi rok nahi
|   Manager  - doosre Manager ko nahi
|   HR       - doosre HR aur Manager ko nahi
|   Employee - HR ko nahi (waise bhi sirf khud ko deta hai)
*/
const BLOCKED_ASSIGNEE_ROLES = {
  [ROLE.HR]: [ROLE.HR, ROLE.MANAGER],
  [ROLE.MANAGER]: [ROLE.MANAGER],
  [ROLE.EMPLOYEE]: [ROLE.HR],
};

// Summary card → list ka sawaal
const CARD_FILTERS = {
  open: (task) => task.status !== COMPLETED_STATUS,
  active: (task) => task.status === IN_PROGRESS_STATUS,
  dueToday: (task, today) => task.status !== COMPLETED_STATUS && task.dueDate === today,
  overdue: (task, today) => isOverdue(task, today),
  doneThisWeek: (task, today) =>
    task.status === COMPLETED_STATUS &&
    getDateKey(task.completedAt || task.updatedAt || 0) >= weekStartKey(today),
};

// Kisi input mein likh rahe ho to "/" aur "n" shortcut nahi chalte
const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function AllTasks() {
  const companyCode = localStorage.getItem("companyCode");
  const { currentUser } = useAuth();

  // Owner Settings se ye sab on/off karta hai. Owner ke liye hamesha true.
  const { canAccessSection, role, isOwner } = useRoleAccess();

  const canViewAll = canAccessSection("tasks.viewAll");
  const showProgress = canAccessSection("tasks.progress");
  const showWorkload = canAccessSection("tasks.workload");
  const showUrgent = canAccessSection("tasks.urgent");
  const showRecent = canAccessSection("tasks.recent");
  const canCreateTask = canAccessSection("tasks.create");
  const canCreateOwn = canAccessSection("tasks.createOwn");
  const canUpdateTask = canAccessSection("tasks.update");
  const canUpdateOwn = canAccessSection("tasks.updateOwn");
  const canArchive = canAccessSection("tasks.delete");
  const canViewActivity = canAccessSection("tasks.activity");
  const canSeeTeam = canAccessSection("tasks.team");

  const myEmployeeId = getCurrentEmployeeId(currentUser);
  const actionUser = getCurrentActionUser(currentUser);

  // Jise doosron ko task dene ka haq nahi par apne liye bana sakta hai —
  // uska assignee khud tay hota hai, form mein choice nahi milti
  const selfAssignOnly = !canCreateTask && canCreateOwn && Boolean(myEmployeeId);
  const canOpenCreate = canCreateTask || selfAssignOnly;

  /*
  | Per-task haq — server ke niyam ka aaina (taskRules.js). Button wahi
  | dikhte hain jo server maanega; galti se dikh bhi jaye to server rok deta.
  */
  const canEditTask = useCallback(
    (task) => canUpdateTask || (canUpdateOwn && isTaskCreator(task, myEmployeeId)),
    [canUpdateTask, canUpdateOwn, myEmployeeId]
  );
  const canChangeStatusOf = useCallback(
    (task) => canEditTask(task) || isOnTask(task, myEmployeeId),
    [canEditTask, myEmployeeId]
  );
  const canManageMembersOf = (task) =>
    canCreateTask && (canEditTask(task) || task?.assignedTo === myEmployeeId);

  // Naam chahiye Team column, workload aur assign dropdown ke liye
  const needsEmployees = canViewAll || showWorkload || canCreateTask;

  const defaultView = canViewAll ? "all" : "mine";
  const { filters, setFilter, setFilters, clearFilters } = useTaskFilters(defaultView);

  const [tasks, setTasks] = useState([]);
  const [people, setPeople] = useState({});
  const [loading, setLoading] = useState(Boolean(companyCode));
  const [error, setError] = useState(companyCode ? "" : "Company code not found. Please log in again.");
  const [archivedTasks, setArchivedTasks] = useState({ loaded: false, list: [] });
  const [team, setTeam] = useState({ loaded: false, members: [], error: "" });
  const [teamReload, setTeamReload] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // "form" (create/edit) ya "members" (sirf team)
  const [formMode, setFormMode] = useState("form");
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(EMPTY_TASK_FORM);

  // Archive / delete — { tasks, permanent }. null matlab modal band
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Sirf id — task list badle to drawer naya task padhta hai, purani copy nahi
  const [drawerTaskId, setDrawerTaskId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [tableContext, setTableContext] = useState(TASK_CONTEXT.ALL);

  const tableRef = useRef(null);
  const searchRef = useRef(null);

  const layout = filters.layout === "team" && !canSeeTeam ? "list" : filters.layout;

  /*
  | Tasks — server se, sirf wahi jo is user ko dikhne chahiye. Koi bhi kahin
  | bhi likhe (meta/version badle) to list apne aap dobara aati hai.
  */
  useEffect(() => {
    if (!companyCode) return undefined;

    return subscribeTasks(
      companyCode,
      (data, names) => {
        setTasks(data);
        setPeople((previous) => ({ ...previous, ...names }));
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load tasks:", err);
        setError(err.message || "Unable to load tasks.");
        setLoading(false);
      }
    );
  }, [companyCode]);

  // Archived tab — sirf jab khula ho, aur sirf tasks.delete wale ke liye
  const wantsArchived = filters.view === "archived" && canArchive;

  useEffect(() => {
    if (!companyCode || !wantsArchived) return undefined;

    return subscribeTasks(
      companyCode,
      (data, names) => {
        setArchivedTasks({ loaded: true, list: data });
        setPeople((previous) => ({ ...previous, ...names }));
      },
      (err) => {
        console.error("Failed to load archived tasks:", err);
        setArchivedTasks({ loaded: true, list: [] });
      },
      { archived: true }
    );
  }, [companyCode, wantsArchived]);

  // Team view — sirf khula ho tab, aur har badlaav par taaza
  const wantsTeam = layout === "team";

  useEffect(() => {
    if (!companyCode || !wantsTeam) return undefined;

    return subscribeTaskVersion(companyCode, async () => {
      try {
        const members = await fetchTaskTeam();
        setTeam({ loaded: true, members, error: "" });
      } catch (err) {
        setTeam((previous) => ({ ...previous, loaded: true, error: err.message }));
      }
    });
  }, [companyCode, wantsTeam, teamReload]);

  // Chalte timer ("1h 20m") aage badhte rahein — har 30 second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  /*
  | Employees — Team column, workload aur assign dropdown ke liye. Shared
  | store se, apna download nahi. Employee role ke liye listener lagta hi
  | nahi; uske teammates ke naam API ke people se aate hain.
  */
  const { employees: employeeRecords } = useEmployees(companyCode, {
    enabled: needsEmployees,
  });

  const employees = useMemo(
    () =>
      Object.entries(employeeRecords)
        .map(([id, employee]) => ({
          id,
          name: employee.personalInfo?.name || id,
          role: employee.account?.role || "",
          departmentId: employee.employmentInfo?.departmentId || "",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employeeRecords]
  );

  /*
  | Manager sirf apne department ko task de / team mein jod sakta hai —
  | wahi niyam jo server (managerScopeIds) aur attendance lagate hain:
  | jin departments ka wo manager hai, unke log, aur wo khud.
  */
  const isManager = role === ROLE.MANAGER;
  const { departments } = useDepartments(companyCode, { enabled: needsEmployees && isManager });

  const managedDepartmentIds = useMemo(() => {
    const me = String(myEmployeeId || "").trim().toUpperCase();
    return new Set(
      Object.entries(departments)
        .filter(([, department]) => String(department?.manager?.employeeId || "").trim().toUpperCase() === me)
        .map(([id]) => id)
    );
  }, [departments, myEmployeeId]);

  const assignableEmployees = useMemo(() => {
    const blocked = BLOCKED_ASSIGNEE_ROLES[role] || [];
    return employees.filter(
      (employee) =>
        employee.id === myEmployeeId ||
        (!blocked.includes(employee.role) &&
          (!isManager || managedDepartmentIds.has(employee.departmentId)))
    );
  }, [employees, role, myEmployeeId, isManager, managedDepartmentIds]);

  /*
  | Form ki list — jo log pehle se is task par hain (HR ne bahar se joda ho)
  | wo bhi, taaki "Add people" kholne par unke naam dikhein aur galti se
  | hat na jaayein. Naye sirf assignableEmployees mein se.
  */
  const formEmployees = useMemo(() => {
    if (!editingTask) return assignableEmployees;
    const team = new Set([editingTask.assignedTo, ...memberIdsOf(editingTask)]);
    const listed = new Set(assignableEmployees.map((employee) => employee.id));
    const extra = employees.filter((employee) => team.has(employee.id) && !listed.has(employee.id));
    return extra.length ? [...assignableEmployees, ...extra] : assignableEmployees;
  }, [assignableEmployees, employees, editingTask]);

  // id → naam: API ke people + employees list (dono mein se jo mile)
  const names = useMemo(
    () => ({
      ...people,
      ...Object.fromEntries(employees.map((employee) => [employee.id, employee.name])),
    }),
    [people, employees]
  );

  // Purane panels { id, name } list maangte hain
  const nameList = useMemo(
    () => Object.entries(names).map(([id, name]) => ({ id, name })),
    [names]
  );

  const today = todayInputValue();

  /* ── Views ── */

  const views = useMemo(
    () =>
      TASK_VIEWS.filter((view) => {
        if (view.needs === "viewAll") return canViewAll;
        if (view.needs === "employee") return Boolean(myEmployeeId);
        if (view.needs === "create") return canCreateTask;
        if (view.needs === "archive") return canArchive;
        return true;
      }),
    [canViewAll, myEmployeeId, canCreateTask, canArchive]
  );

  const view = views.some((item) => item.key === filters.view) ? filters.view : views[0]?.key;
  const archivedMode = view === "archived";

  const viewTasks = useMemo(() => {
    const byView = {
      all: () => tasks,
      mine: () => filterOwnTasks(tasks, currentUser),
      assigned: () => tasks.filter((task) => task.createdById === actionUser.id),
      overdue: () => tasks.filter((task) => isOverdue(task, today)),
      completed: () => tasks.filter((task) => task.status === COMPLETED_STATUS),
      archived: () => archivedTasks.list,
    };
    return (byView[view] || byView.all)();
  }, [view, tasks, archivedTasks.list, currentUser, actionUser.id, today]);

  const viewCounts = useMemo(
    () => ({
      all: tasks.length,
      mine: filterOwnTasks(tasks, currentUser).length,
      assigned: tasks.filter((task) => task.createdById === actionUser.id).length,
      overdue: tasks.filter((task) => isOverdue(task, today)).length,
      completed: tasks.filter((task) => task.status === COMPLETED_STATUS).length,
      ...(archivedTasks.loaded ? { archived: archivedTasks.list.length } : {}),
    }),
    [tasks, archivedTasks, currentUser, actionUser.id, today]
  );

  /*
  | Dashboard ka saara data — summary aur panels usi list se jo table use
  | karta hai. List server se pehle hi user ke daayre mein chhanti aati hai
  | (viewAll ho to sab, warna jin par wo hai ya jo usne diye).
  */
  const summary = useMemo(() => taskSummary(tasks, today), [tasks, today]);
  const progress = useMemo(() => taskProgress(summary), [summary]);
  const workload = useMemo(() => teamWorkload(tasks, nameList), [tasks, nameList]);
  const urgent = useMemo(() => urgentTasks(tasks, today, SECTION_ROW_LIMIT), [tasks, today]);
  const recent = useMemo(() => recentTasks(tasks, SECTION_ROW_LIMIT), [tasks]);

  // Filter ke "Person" dropdown mein wahi log jo in tasks par hain
  const filterPeople = useMemo(() => {
    const ids = new Set(viewTasks.flatMap((task) => teamOf(task)));
    return [...ids]
      .map((id) => ({ id, name: names[id] || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [viewTasks, names]);

  /* ── List pipeline: view → section → card → filters → sort ── */

  const visibleTasks = useMemo(() => {
    let list = viewTasks;

    if (tableContext === TASK_CONTEXT.URGENT) list = urgentTasks(list, today, Infinity);
    if (tableContext === TASK_CONTEXT.RECENT) list = recentTasks(list, Infinity);

    const card = CARD_FILTERS[filters.card];
    if (card) list = list.filter((task) => card(task, today));

    list = filterTasks(list, {
      search: filters.search,
      statusFilter: filters.status,
      allStatuses: ALL_STATUSES,
      priority: filters.priority,
      assignee: filters.assignee,
      due: filters.due,
      names,
      today,
    });

    // "Recent" ka apna kram hai — sort use bigaade nahi
    return tableContext === TASK_CONTEXT.RECENT ? list : sortTasks(list, filters.sort);
  }, [viewTasks, tableContext, filters, names, today]);

  const {
    paginatedData: pageTasks,
    currentPage,
    totalPages,
    totalItems,
    startItem,
    endItem,
    pageSize,
    goToPage,
    changePageSize,
    resetPagination,
  } = usePagination({ data: visibleTasks, initialPageSize: TASK_PAGE_SIZE });

  // Filter badla to list hi nayi hai — page 1, aur purana selection saaf
  const filterKey = `${view}|${tableContext}|${filters.card}|${filters.search}|${filters.status}|${filters.priority}|${filters.assignee}|${filters.due}|${filters.sort}`;

  useEffect(() => {
    resetPagination();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const [selectionKey, setSelectionKey] = useState(filterKey);
  if (selectionKey !== filterKey) {
    // Render ke dauraan hi — effect mein setState se ek faltu render bachta hai
    setSelectionKey(filterKey);
    setSelectedIds(new Set());
  }

  // Main abhi kis task par hoon — upar ki "Working on" patti ke liye
  const myWork = useMemo(
    () => (myEmployeeId ? tasks.find((task) => Number.isFinite(task.working?.[myEmployeeId])) : null),
    [tasks, myEmployeeId]
  );

  const allTasks = useMemo(() => [...tasks, ...archivedTasks.list], [tasks, archivedTasks.list]);
  const drawerTask = useMemo(
    () => allTasks.find((task) => task.id === drawerTaskId) || null,
    [allTasks, drawerTaskId]
  );

  /* ── Keyboard: "/" search, "n" naya task ── */

  const anyModalOpen = showForm || Boolean(archiveTarget) || Boolean(drawerTaskId);

  const openCreateForm = useCallback(() => {
    setEditingTask(null);
    setFormMode("form");
    setFormData({ ...EMPTY_TASK_FORM, assignedTo: selfAssignOnly ? myEmployeeId : "" });
    setErrors({});
    setShowForm(true);
  }, [selfAssignOnly, myEmployeeId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (anyModalOpen || isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if ((event.key === "n" || event.key === "N") && canOpenCreate) {
        event.preventDefault();
        openCreateForm();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [anyModalOpen, canOpenCreate, openCreateForm]);

  /* ── Actions ── */

  const showTableContext = (context) => {
    setTableContext(context);
    setFilters({ view: defaultView, status: ALL_STATUSES, card: "", layout: "list" });
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickCard = (key) => {
    setTableContext(TASK_CONTEXT.ALL);
    setFilters({
      card: filters.card === key ? "" : key,
      view: defaultView,
      layout: layout === "team" ? "list" : layout,
    });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const openEditForm = (task) => {
    setEditingTask(task);
    setFormMode("form");
    setFormData({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      members: memberIdsOf(task),
      dueDate: task.dueDate || "",
      priority: task.priority || EMPTY_TASK_FORM.priority,
    });
    setErrors({});
    setShowForm(true);
  };

  const openMembersForm = (task) => {
    openEditForm(task);
    setFormMode("members");
  };

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingTask(null);
    setErrors({});
  }, []);

  const sameMembers = (a = [], b = []) =>
    a.length === b.length && a.every((id) => b.includes(id));

  const handleSubmit = async () => {
    const membersOnly = formMode === "members";

    if (!membersOnly) {
      const fieldErrors = {
        title: validateField("taskTitle", formData.title),
        description: validateField("taskDescription", formData.description),
        assignedTo: validateField("taskAssignee", formData.assignedTo),
        dueDate: validateField("taskDueDate", formData.dueDate),
      };

      // Edit mein date na badli ho to "past" ka check nahi
      if (editingTask && formData.dueDate === editingTask.dueDate) fieldErrors.dueDate = "";

      if (Object.values(fieldErrors).some(Boolean)) {
        setErrors(fieldErrors);
        return;
      }
    }

    const members = canCreateTask ? formData.members || [] : [];

    setSaving(true);
    try {
      if (editingTask) {
        const changes = membersOnly
          ? { members }
          : {
              title: formData.title.trim(),
              description: formData.description.trim(),
              assignedTo: selfAssignOnly ? myEmployeeId : formData.assignedTo,
              dueDate: formData.dueDate,
              priority: formData.priority,
              ...(canManageMembersOf(editingTask) && !sameMembers(members, memberIdsOf(editingTask))
                ? { members }
                : {}),
            };

        // Jo updatedAt dekh kar form khula tha — beech mein kisi ne badla to server rokega
        await updateTask(companyCode, editingTask.id, {
          ...changes,
          expectedUpdatedAt: editingTask.updatedAt,
        });
      } else {
        await createTask(companyCode, {
          ...formData,
          title: formData.title.trim(),
          description: formData.description.trim(),
          assignedTo: selfAssignOnly ? myEmployeeId : formData.assignedTo,
          members,
        });
      }

      setFormData(EMPTY_TASK_FORM);
      closeForm();
      toast.success(
        membersOnly ? "Team updated." : editingTask ? "Task updated successfully." : "Task created successfully."
      );
    } catch (err) {
      console.error("Failed to save task:", err);
      toast.error(err.message || (editingTask ? "Unable to update the task." : "Unable to create the task."));
    } finally {
      setSaving(false);
    }
  };

  /*
  | Status — list turant badal jaati hai (optimistic), server baad mein
  | haan kehta hai. Mana kare to purana status wapas, aur wajah toast mein.
  |
  | Jinka kaam apne aap ruka (ek insaan, ek waqt, ek kaam) unke naam bhi
  | toast mein — warna lagta hai list apne aap badal gayi.
  |
  | Team ka banda Paused chune aur baaki kaam kar rahe hon to server sirf
  | uska kaam rokta hai (onlyMine) — task In Progress hi rehta hai.
  */
  const changeStatus = async (task, status) => {
    if (task.status === status) return;

    const previous = task.status;
    setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, status } : item)));

    try {
      const { changed, paused, onlyMine } = await updateTaskStatus(companyCode, task, status);

      /*
      | Team ke baaki abhi kaam kar rahe hain — server ne sirf mera kaam
      | roka, task In Progress hi hai. List ko wapas karo, aur saaf batao.
      */
      if (onlyMine) {
        setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, status: previous } : item)));
        if (changed) toast.success("You stopped your work. The task stays In Progress for your teammates.");
        else toast.info("Your teammates are still working, so the task stays In Progress.");
        return;
      }

      if (!changed) return;

      toast.success(
        paused.length === 1
          ? `Task moved to ${status}. "${paused[0]}" paused.`
          : paused.length > 1
            ? `Task moved to ${status}. ${paused.length} tasks paused.`
            : `Task moved to ${status}.`
      );
    } catch (err) {
      console.error("Failed to update task status:", err);
      setTasks((list) => list.map((item) => (item.id === task.id ? { ...item, status: previous } : item)));
      toast.error(err.message || "Unable to update task status.");
    }
  };

  const changeWork = async (task, action) => {
    try {
      const { changed, paused } = await setTaskWork(task, action);
      if (!changed) return;
      toast.success(
        action === "start"
          ? paused.length
            ? `You joined the work. "${paused[0]}" paused.`
            : "You joined the work."
          : "You stopped working on this task."
      );
    } catch (err) {
      toast.error(err.message || "Unable to update your work.");
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;

    const { tasks: targets, permanent } = archiveTarget;
    setArchiving(true);

    let failed = 0;
    for (const task of targets) {
      try {
        if (permanent) await deleteTaskPermanently(task);
        else await archiveTask(task);
      } catch (err) {
        console.error("Failed to archive task:", err);
        failed += 1;
      }
    }

    setArchiving(false);
    setArchiveTarget(null);
    setSelectedIds(new Set());
    if (drawerTaskId && targets.some((task) => task.id === drawerTaskId)) setDrawerTaskId(null);

    const done = targets.length - failed;
    if (done) {
      toast.success(
        permanent
          ? "Task deleted permanently."
          : done === 1
            ? "Task archived. Restore it from the Archived tab."
            : `${done} tasks archived.`
      );
    }
    if (failed) toast.error(`${failed} task${failed > 1 ? "s" : ""} could not be ${permanent ? "deleted" : "archived"}.`);
  };

  const handleRestore = async (task) => {
    try {
      await restoreTask(task);
      toast.success("Task restored.");
    } catch (err) {
      toast.error(err.message || "Unable to restore the task.");
    }
  };

  /* ── Bulk ── */

  const selectedTasks = pageTasks.filter((task) => selectedIds.has(task.id));

  const toggleOne = (task) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });

  const toggleAll = (checked) =>
    setSelectedIds(checked ? new Set(pageTasks.map((task) => task.id)) : new Set());

  // Ek-ek karke — ek saath bhejte to "ek insaan, ek kaam" ka auto-pause aapas mein takraata
  const runBulk = async (label, work, allowed) => {
    const targets = selectedTasks.filter(allowed);
    const skipped = selectedTasks.length - targets.length;

    setBulkBusy(true);
    let failed = 0;
    for (const task of targets) {
      try {
        await work(task);
      } catch (err) {
        console.error(`Bulk ${label} failed:`, err);
        failed += 1;
      }
    }
    setBulkBusy(false);
    setSelectedIds(new Set());

    const done = targets.length - failed;
    if (done) toast.success(`${done} task${done > 1 ? "s" : ""} ${label}.`);
    if (failed || skipped) {
      toast.error(`${failed + skipped} task${failed + skipped > 1 ? "s were" : " was"} not changed.`);
    }
  };

  const bulkStatus = (status) =>
    runBulk(
      `moved to ${status}`,
      (task) => updateTaskStatus(companyCode, task, status),
      (task) => canChangeStatusOf(task) && task.status !== status
    );

  const bulkReassign = (employeeId) =>
    runBulk(
      `reassigned to ${names[employeeId] || employeeId}`,
      (task) =>
        updateTask(companyCode, task.id, {
          assignedTo: employeeId,
          expectedUpdatedAt: task.updatedAt,
        }),
      (task) => canEditTask(task) && task.assignedTo !== employeeId
    );

  /* ── Render ── */

  const showTeamColumn = canViewAll || canCreateTask;
  const showListTools = layout !== "team";
  const listLoading = loading || (archivedMode && !archivedTasks.loaded);

  return (
    <div className="min-h-full flex-1 space-y-6 sm:space-y-8">
      <TaskPageHeader
        title="Tasks"
        eyebrow="Task management"
        subtitle={
          canViewAll
            ? "Plan work, keep ownership clear, and stay ahead of deadlines"
            : "Everything you are working on, in one place"
        }
        icon={<FiCheckSquare size={14} />}
        action={
          <>
            <TaskLayoutSwitch
              value={layout}
              onChange={(next) => setFilter("layout", next)}
              showTeam={canSeeTeam}
            />
            {canOpenCreate && (
              <button
                type="button"
                onClick={openCreateForm}
                title="Create task (N)"
                className={`${PRIMARY_BUTTON_CLASS} w-full justify-center sm:w-auto`}
              >
                <FiPlus />
                Create task
              </button>
            )}
          </>
        }
      />

      <div className="space-y-4 sm:space-y-6">
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

        <TaskWorkingBar
          task={myWork}
          step={myWork?.workingStep?.[myEmployeeId]}
          since={myWork?.working?.[myEmployeeId]}
          now={now}
          onStop={() => changeWork(myWork, "stop")}
          onOpen={() => setDrawerTaskId(myWork.id)}
        />

        <TaskSummaryCards summary={summary} activeKey={filters.card} onPick={pickCard} />

        <div ref={tableRef} className="ui-card overflow-hidden">
          {layout === "team" ? (
            <>
              <div className="border-b border-line px-5 py-4">
                <h2 className="ui-card-title">Team</h2>
                <p className="ui-card-subtitle">
                  {isOwner || role === ROLE.HR
                    ? "Everyone in the company. Click a person to see their tasks."
                    : "People in the departments you manage. Click a person to see their tasks."}
                </p>
              </div>
              <TaskTeamView
                members={team.members}
                loading={!team.loaded}
                error={team.error}
                now={now}
                onRetry={() => setTeamReload((count) => count + 1)}
                onPick={(employeeId) =>
                  setFilters({ layout: "list", view: defaultView, assignee: employeeId, card: "" })
                }
              />
            </>
          ) : (
            <>
              <TaskViewTabs
                views={views}
                active={view}
                counts={viewCounts}
                onChange={(next) => {
                  setTableContext(TASK_CONTEXT.ALL);
                  setFilters({ view: next, card: "" });
                }}
              />

              {showListTools && (
                <TaskToolbar
                  ref={searchRef}
                  filters={filters}
                  onChange={setFilter}
                  onClear={() => {
                    setTableContext(TASK_CONTEXT.ALL);
                    clearFilters();
                  }}
                  people={filterPeople}
                  showPerson={filterPeople.length > 1}
                />
              )}

              {(tableContext !== TASK_CONTEXT.ALL || filters.card) && (
                <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
                  <span className="text-sm text-ink-subtle">
                    {visibleTasks.length} task{visibleTasks.length === 1 ? "" : "s"}
                  </span>
                  {tableContext !== TASK_CONTEXT.ALL && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-700">
                      Showing: {TASK_CONTEXT_LABELS[tableContext]}
                      <button
                        type="button"
                        onClick={() => setTableContext(TASK_CONTEXT.ALL)}
                        aria-label="Show all tasks"
                        className="cursor-pointer rounded-full p-0.5 transition hover:bg-blue-100"
                      >
                        <FiX size={14} />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {layout === "list" && !archivedMode && (
                <TaskBulkBar
                  count={selectedTasks.length}
                  busy={bulkBusy}
                  people={assignableEmployees}
                  canChangeStatus={selectedTasks.some(canChangeStatusOf)}
                  canReassign={canCreateTask && selectedTasks.some(canEditTask)}
                  canArchive={canArchive}
                  onStatus={bulkStatus}
                  onReassign={bulkReassign}
                  onArchive={() => setArchiveTarget({ tasks: selectedTasks, permanent: false })}
                  onClear={() => setSelectedIds(new Set())}
                />
              )}

              {listLoading ? (
                <TaskListSkeleton />
              ) : layout === "board" && !archivedMode ? (
                <TaskBoard
                  tasks={visibleTasks}
                  names={names}
                  canChangeStatus={canChangeStatusOf}
                  onStatusChange={changeStatus}
                  onRowClick={(task) => setDrawerTaskId(task.id)}
                  onCreate={canOpenCreate ? openCreateForm : undefined}
                />
              ) : (
                <>
                  <TaskTable
                    tasks={pageTasks}
                    names={names}
                    now={now}
                    hasTasks={viewTasks.length > 0}
                    showTeam={showTeamColumn}
                    archivedMode={archivedMode}
                    selectable={!archivedMode}
                    selectedIds={selectedIds}
                    onToggle={toggleOne}
                    onToggleAll={toggleAll}
                    canEdit={canEditTask}
                    canChangeStatus={canChangeStatusOf}
                    canArchive={canArchive}
                    canDeletePermanent={isOwner}
                    onStatusChange={changeStatus}
                    onEdit={openEditForm}
                    onArchive={(task) => setArchiveTarget({ tasks: [task], permanent: false })}
                    onRestore={handleRestore}
                    onDeletePermanent={(task) => setArchiveTarget({ tasks: [task], permanent: true })}
                    onRowClick={(task) => setDrawerTaskId(task.id)}
                    onCreate={canOpenCreate ? openCreateForm : undefined}
                  />

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
                </>
              )}
            </>
          )}
        </div>

        {/*
          Insights — list ke baad, upar nahi. Har panel apni permission par;
          ek chhip jaye to doosra poori chaudai le leta hai.
        */}
        {(showProgress || showWorkload) && (
          <div
            className={`grid grid-cols-1 items-start gap-4 sm:gap-6 ${
              showProgress && showWorkload ? "lg:grid-cols-2" : ""
            }`}
          >
            {showProgress && <TaskProgress progress={progress} />}
            {showWorkload && <TeamWorkload workload={workload} />}
          </div>
        )}

        {(showUrgent || showRecent) && (
          <div
            className={`grid grid-cols-1 gap-4 sm:gap-6 ${
              showUrgent && showRecent ? "lg:grid-cols-2" : ""
            }`}
          >
            {showUrgent && (
              <UrgentTasks
                tasks={urgent}
                employees={nameList}
                today={today}
                onViewAll={() => showTableContext(TASK_CONTEXT.URGENT)}
              />
            )}
            {showRecent && (
              <RecentTasks
                tasks={recent}
                employees={nameList}
                onViewAll={() => showTableContext(TASK_CONTEXT.RECENT)}
              />
            )}
          </div>
        )}
      </div>

      {/*
        Drawer pehle, modals baad mein — dono z-50 hain, to jo baad mein aata
        hai wo upar dikhta hai. Drawer se "Edit" dabao to form drawer ke upar
        khulna chahiye.
      */}
      <TaskDrawer
        open={Boolean(drawerTask)}
        suspended={showForm || Boolean(archiveTarget)}
        task={drawerTask}
        names={names}
        companyCode={companyCode}
        myEmployeeId={myEmployeeId}
        now={now}
        canChangeStatus={Boolean(drawerTask) && canChangeStatusOf(drawerTask)}
        canEdit={Boolean(drawerTask) && canEditTask(drawerTask)}
        canArchive={canArchive}
        canManageMembers={Boolean(drawerTask) && canManageMembersOf(drawerTask)}
        canViewActivity={canViewActivity}
        onClose={() => setDrawerTaskId(null)}
        onStatusChange={changeStatus}
        onWork={changeWork}
        onEdit={openEditForm}
        onManageMembers={openMembersForm}
        onArchive={(task) => setArchiveTarget({ tasks: [task], permanent: false })}
      />

      <CreateTaskModal
        open={showForm}
        isEdit={Boolean(editingTask)}
        mode={formMode}
        canAddMembers={canCreateTask}
        formData={formData}
        errors={errors}
        // Sirf wahi log jinhe ye user task de sakta hai
        employees={formEmployees}
        selfAssign={selfAssignOnly}
        saving={saving}
        onChange={updateField}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />

      <DeleteTaskModal
        open={Boolean(archiveTarget)}
        task={archiveTarget?.tasks[0]}
        count={archiveTarget?.tasks.length || 0}
        permanent={archiveTarget?.permanent}
        deleting={archiving}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}

export default AllTasks;
