import { FiEdit2, FiInbox, FiPlus, FiTrash2 } from "react-icons/fi";
import { TASK_STATUSES } from "../../services/taskService";
import { PRIMARY_BUTTON_CLASS } from "../../utils/tasks/taskConstants";
import {
  assigneeName,
  formatDate,
  initials,
  isOverdue,
  todayInputValue,
} from "../../utils/tasks/taskUtils";
import TaskBadge from "./TaskBadge";

/*
|--------------------------------------------------------------------------
| Task Table
|--------------------------------------------------------------------------
| Sirf list dikhata hai. Firebase se baat nahi karta — status badalna ya
| delete karna page ka kaam hai, ye bas onStatusChange / onDelete bula deta hai.
|
| hasTasks: filter lagne se pehle koi task tha ya nahi. Isse tay hota hai ki
| khaali table par "No matching tasks" dikhe ya "No tasks yet".
|--------------------------------------------------------------------------
*/

function RowAction({ tone, title, onClick, icon }) {
  const styles = {
    edit: "hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600",
    delete: "hover:border-red-500 hover:bg-red-50 hover:text-red-600",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all ${styles[tone]}`}
    >
      {icon}
    </button>
  );
}

function TaskTable({
  tasks,
  employees,
  onStatusChange,
  onEdit,
  onDelete,
  onCreate,
  // Row click/Enter par details modal — page se aata hai. Na mile to row
  // saadi rehti hai.
  onRowClick,
  hasTasks,
  // Teeno alag permission se aate hain. showAssignee false ho to sirf apne
  // hi tasks dikh rahe hain, to Assignee column bekaar hai.
  showAssignee = true,
  canUpdate = true,
  canDelete = true,
}) {
  // Actions column tabhi, jab kam se kam ek button ho
  const showActions = canUpdate || canDelete;
  const today = todayInputValue();

  // Status/Edit/Delete row ke andar hain — unka event upar na jaye,
  // warna status badalte hi details modal bhi khul jaata
  const stopRowActivation = {
    onClick: (event) => event.stopPropagation(),
    onKeyDown: (event) => event.stopPropagation(),
  };

  // Mouse ke bina bhi details tak pahunch — Space page ko scroll karta hai,
  // isliye preventDefault
  const handleRowKeyDown = (event, task) => {
    if (!onRowClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    onRowClick(task);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="w-16 px-6 py-4 text-center">#</th>
            <th className="px-6 py-4">Task</th>
            {showAssignee && <th className="px-6 py-4">Assignee</th>}
            <th className="px-6 py-4">Due date</th>
            <th className="px-6 py-4">Priority</th>
            <th className="px-6 py-4">Status</th>
            {showActions && (
              <th className="w-28 px-6 py-4 text-center">Actions</th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {tasks.map((task, index) => {
            const name = assigneeName(task, employees);
            const overdue = isOverdue(task, today);

            return (
              <tr
                key={task.id}
                onClick={() => onRowClick?.(task)}
                onKeyDown={(event) => handleRowKeyDown(event, task)}
                // Keyboard tabhi, jab row par kuch hota ho
                tabIndex={onRowClick ? 0 : undefined}
                title={onRowClick ? `View details of ${task.title}` : undefined}
                className={`transition-colors hover:bg-slate-50/70 ${
                  onRowClick
                    ? "cursor-pointer focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    : ""
                }`}
              >
                {/* Row ka number — filter lagne par bhi 1, 2, 3 hi rahega */}
                <td className="px-6 py-4 text-center text-sm font-semibold text-slate-400">
                  {index + 1}
                </td>

                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-1 max-w-sm text-xs text-slate-500">
                      {task.description}
                    </p>
                  )}
                </td>

                {showAssignee && (
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {initials(name)}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {name}
                      </span>
                    </div>
                  </td>
                )}

                <td className="px-6 py-4">
                  <span
                    className={`text-sm ${
                      overdue
                        ? "font-semibold text-red-600"
                        : "font-medium text-slate-700"
                    }`}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                  {overdue && (
                    <p className="mt-0.5 text-xs font-medium text-red-500">
                      Overdue
                    </p>
                  )}
                </td>

                <td className="px-6 py-4">
                  <TaskBadge value={task.priority || "Medium"} variant="priority" />
                </td>

                {/* Status badalne par details modal nahi khulna chahiye */}
                <td className="px-6 py-4" {...stopRowActivation}>
                  <div className="relative inline-block">
                    <select
                      value={task.status || TASK_STATUSES[0]}
                      onChange={(event) =>
                        onStatusChange(task, event.target.value)
                      }
                      aria-label={`Change status of ${task.title}`}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                    <TaskBadge value={task.status || TASK_STATUSES[0]} />
                  </div>
                </td>

                {showActions && (
                  // Edit/Delete dabane par bhi modal nahi khulna chahiye
                  <td className="px-6 py-4" {...stopRowActivation}>
                    <div className="flex items-center justify-center gap-2">
                      {canUpdate && (
                        <RowAction
                          tone="edit"
                          title={`Edit ${task.title}`}
                          onClick={() => onEdit(task)}
                          icon={<FiEdit2 size={16} />}
                        />
                      )}
                      {canDelete && (
                        <RowAction
                          tone="delete"
                          title={`Delete ${task.title}`}
                          onClick={() => onDelete(task)}
                          icon={<FiTrash2 size={16} />}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}

          {tasks.length === 0 && (
            <tr>
              {/* Assignee aur Actions column chhip sakte hain */}
              <td
                colSpan={5 + (showAssignee ? 1 : 0) + (showActions ? 1 : 0)}
                className="px-6 py-20"
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FiInbox size={26} />
                  </span>

                  {hasTasks ? (
                    // Tasks hain, bas filter se match nahi hue
                    <div>
                      <p className="font-semibold text-slate-800">
                        No matching tasks
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Try a different search or status filter.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {showAssignee ? "No tasks yet" : "Nothing assigned yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {onCreate
                            ? "Create your first task to start tracking work."
                            : "Tasks assigned to you will show up here."}
                        </p>
                      </div>

                      {onCreate && (
                        <button
                          type="button"
                          onClick={onCreate}
                          className={PRIMARY_BUTTON_CLASS}
                        >
                          <FiPlus />
                          Create task
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TaskTable;
